import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the tables service.
 * All requests to /tables/* are forwarded to the tables service
 * with the authenticated user context.
 *
 * Uses @fastify/http-proxy for automatic proxying including WebSocket support.
 */
export async function registerTablesRoutes(fastify: FastifyInstance) {
  // HTTP proxy for REST API
  await fastify.register(httpProxy, {
    upstream: config.tablesServiceUrl,
    prefix: "/tables",
    rewritePrefix: "",
    // Only proxy these methods - let CORS handle OPTIONS
    httpMethods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    // Authenticate all requests before proxying
    preHandler: authenticateRequest,
    // Add user context header to proxied requests
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => {
        // Get user from request (set by authenticateRequest)
        const user = (originalRequest as { user?: { email: string } }).user;
        if (user) {
          return {
            ...headers,
            // Use email as the user ID (consistent with agent proxy)
            "x-user-id": user.email,
            "x-user-email": user.email,
          };
        }
        return headers;
      },
    },
    // Note: WebSocket handled separately below with custom auth
  });

  // WebSocket endpoint for real-time table updates
  // This handles the WebSocket upgrade and authentication
  fastify.get(
    "/tables/ws/:tableId",
    { websocket: true },
    async (socket, req) => {
      const { tableId } = req.params as { tableId: string };

      // Authenticate WebSocket connection
      const authResult = await authenticateWebSocket(req);
      if (!authResult.success) {
        socket.send(
          JSON.stringify({
            type: "ERROR",
            code: "UNAUTHORIZED",
            message: authResult.error,
          }),
        );
        socket.close(1008, authResult.error);
        return;
      }

      // Forward to tables service WebSocket
      const upstreamUrl = `${config.tablesServiceUrl.replace("http", "ws")}/ws/${tableId}`;
      const upstreamWs = new (await import("ws")).WebSocket(upstreamUrl, {
        headers: {
          "x-user-id": authResult.user.id,
          "x-user-email": authResult.user.email,
        },
      });

      // Handle upstream connection
      upstreamWs.on("open", () => {
        fastify.log.debug(
          { tableId, userId: authResult.user.id },
          "Upstream WebSocket connected",
        );
      });

      // Forward messages from upstream to client
      upstreamWs.on("message", (data) => {
        if (socket.readyState === 1) {
          socket.send(data.toString());
        }
      });

      // Forward messages from client to upstream
      socket.on("message", (data) => {
        if (upstreamWs.readyState === 1) {
          upstreamWs.send(data.toString());
        }
      });

      // Handle upstream close
      upstreamWs.on("close", (code, reason) => {
        fastify.log.debug({ tableId, code }, "Upstream WebSocket closed");
        if (socket.readyState === 1) {
          socket.close(code, reason.toString());
        }
      });

      // Handle upstream error
      upstreamWs.on("error", (err) => {
        fastify.log.error({ err, tableId }, "Upstream WebSocket error");
        if (socket.readyState === 1) {
          socket.send(
            JSON.stringify({
              type: "ERROR",
              code: "UPSTREAM_ERROR",
              message: "Connection error",
            }),
          );
          socket.close(1011, "Upstream error");
        }
      });

      // Handle client close
      socket.on("close", () => {
        if (upstreamWs.readyState === 1) {
          upstreamWs.close();
        }
      });

      // Handle client error
      socket.on("error", (err) => {
        fastify.log.error({ err, tableId }, "Client WebSocket error");
        if (upstreamWs.readyState === 1) {
          upstreamWs.close();
        }
      });
    },
  );

  // Yjs WebSocket proxy for real-time collaborative editing
  // This handles Hocuspocus protocol connections
  fastify.get(
    "/yjs",
    { websocket: true },
    async (socket, req) => {
      fastify.log.info("[Yjs Proxy] New connection");

      // Authenticate WebSocket connection
      const authResult = await authenticateWebSocket(req);
      if (!authResult.success) {
        fastify.log.warn({ error: authResult.error }, "[Yjs Proxy] Auth failed");
        socket.close(1008, authResult.error);
        return;
      }

      fastify.log.info({ userId: authResult.user.id }, "[Yjs Proxy] Auth success");

      // Forward to Yjs server (Hocuspocus)
      const upstreamUrl = config.yjsServiceUrl;
      fastify.log.info({ upstreamUrl }, "[Yjs Proxy] Connecting to upstream");

      const upstreamWs = new (await import("ws")).WebSocket(upstreamUrl, {
        headers: {
          "x-user-id": authResult.user.id,
          "x-user-email": authResult.user.email,
        },
      });

      // Handle upstream connection
      upstreamWs.on("open", () => {
        fastify.log.info("[Yjs Proxy] Upstream connected");
      });

      // Forward messages from upstream to client (binary for Yjs)
      upstreamWs.on("message", (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        fastify.log.debug("[Yjs Proxy] Upstream -> Client");
        if (socket.readyState === 1) {
          // Send as binary buffer for Yjs protocol
          socket.send(data as Buffer);
        }
      });

      // Forward messages from client to upstream (binary for Yjs)
      socket.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
        fastify.log.debug("[Yjs Proxy] Client -> Upstream");
        if (upstreamWs.readyState === 1) {
          // Forward as-is for Yjs protocol
          upstreamWs.send(data as Buffer);
        }
      });

      // Handle upstream close
      upstreamWs.on("close", (code, reason) => {
        fastify.log.info({ code }, "[Yjs Proxy] Upstream closed");
        if (socket.readyState === 1) {
          socket.close(code, reason.toString());
        }
      });

      // Handle upstream error
      upstreamWs.on("error", (err) => {
        fastify.log.error({ err }, "[Yjs Proxy] Upstream error");
        if (socket.readyState === 1) {
          socket.close(1011, "Upstream error");
        }
      });

      // Handle client close
      socket.on("close", () => {
        fastify.log.info("[Yjs Proxy] Client closed");
        if (upstreamWs.readyState === 1) {
          upstreamWs.close();
        }
      });

      // Handle client error
      socket.on("error", (err) => {
        fastify.log.error({ err }, "[Yjs Proxy] Client error");
        if (upstreamWs.readyState === 1) {
          upstreamWs.close();
        }
      });
    },
  );
}

/**
 * Authenticate a WebSocket upgrade request.
 * Extracts the token from the Authorization header or query parameter.
 */
async function authenticateWebSocket(
  req: FastifyRequest,
): Promise<
  | { success: true; user: { id: string; email: string } }
  | { success: false; error: string }
> {
  try {
    // Try Authorization header first
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Fall back to query parameter (common for WebSocket connections)
    if (!token) {
      const query = req.query as { token?: string };
      token = query.token;
    }

    if (!token) {
      return { success: false, error: "Missing authentication token" };
    }

    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return { success: false, error: "Invalid token type" };
    }

    if (payload.email !== config.allowedEmail) {
      return { success: false, error: "Access denied" };
    }

    // Use email as user ID (consistent with existing auth flow)
    return {
      success: true,
      user: { id: payload.email, email: payload.email },
    };
  } catch (_error) {
    return { success: false, error: "Invalid or expired token" };
  }
}
