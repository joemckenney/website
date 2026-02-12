import { context, propagation, trace } from "@website/tracing";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { verifyAccessToken } from "../lib/jwt.js";
import { tableBaseCache } from "../lib/table-base-cache.js";
import { getTablesUpstream } from "../lib/tables-router.js";
import { authenticateRequest } from "../middleware/auth.js";

const tracer = trace.getTracer("gateway-ws");

/**
 * Proxy routes for the tables service.
 *
 * When sharding is enabled (tablesShardCount > 1), requests are routed
 * to the specific StatefulSet pod that owns the target base. When
 * sharding is disabled, all requests go to the ClusterIP service.
 *
 * baseId extraction strategy:
 *   /tables/bases          → ClusterIP (any pod, queries PostgreSQL)
 *   /tables/bases/:baseId  → URL param
 *   /tables/tables?baseId  → query param
 *   /tables/tables (POST)  → request body
 *   /tables/tables/:tableId/* → cache lookup (tableId → baseId)
 *   /tables/ws/:tableId    → cache lookup
 */
export async function registerTablesRoutes(fastify: FastifyInstance) {
  // ── Base routes (no shard logic — all hit ClusterIP / any pod) ──

  fastify.all(
    "/tables/bases",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      return proxyToUpstream(req, reply, config.tablesServiceUrl, "/bases");
    },
  );

  fastify.all(
    "/tables/bases/:baseId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { baseId } = req.params as { baseId: string };
      const upstream = getTablesUpstream(baseId);
      return proxyToUpstream(req, reply, upstream, `/bases/${baseId}`);
    },
  );

  // ── Table routes ──

  // POST /tables/tables — create table (baseId in body)
  fastify.post(
    "/tables/tables",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const body = req.body as { baseId?: string } | undefined;
      const baseId = body?.baseId;
      const upstream = baseId
        ? getTablesUpstream(baseId)
        : config.tablesServiceUrl;
      return proxyToUpstream(req, reply, upstream, "/tables");
    },
  );

  // GET /tables/tables — list tables (optional baseId query param)
  fastify.get(
    "/tables/tables",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const query = req.query as { baseId?: string };
      const upstream = query.baseId
        ? getTablesUpstream(query.baseId)
        : config.tablesServiceUrl;
      const qs = req.url.split("?")[1];
      const path = qs ? `/tables?${qs}` : "/tables";
      return proxyToUpstream(req, reply, upstream, path);
    },
  );

  // Routes with :tableId — resolve via cache
  fastify.all(
    "/tables/tables/:tableId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId } = req.params as { tableId: string };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(req, reply, upstream, `/tables/${tableId}`);
    },
  );

  fastify.all(
    "/tables/tables/:tableId/columns",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId } = req.params as { tableId: string };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/columns`,
      );
    },
  );

  fastify.all(
    "/tables/tables/:tableId/columns/:columnId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId, columnId } = req.params as {
        tableId: string;
        columnId: string;
      };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/columns/${columnId}`,
      );
    },
  );

  fastify.all(
    "/tables/tables/:tableId/rows",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId } = req.params as { tableId: string };
      const upstream = await resolveUpstreamForTable(tableId);
      const qs = req.url.split("?")[1];
      const path = qs
        ? `/tables/${tableId}/rows?${qs}`
        : `/tables/${tableId}/rows`;
      return proxyToUpstream(req, reply, upstream, path);
    },
  );

  fastify.all(
    "/tables/tables/:tableId/rows/:rowId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId, rowId } = req.params as {
        tableId: string;
        rowId: string;
      };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/rows/${rowId}`,
      );
    },
  );

  fastify.all(
    "/tables/tables/:tableId/rows/:rowId/cells/:columnId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId, rowId, columnId } = req.params as {
        tableId: string;
        rowId: string;
        columnId: string;
      };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/rows/${rowId}/cells/${columnId}`,
      );
    },
  );

  // Aggregate endpoint
  fastify.all(
    "/tables/tables/:tableId/aggregate",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId } = req.params as { tableId: string };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/aggregate`,
      );
    },
  );

  // Agent routes
  fastify.all(
    "/tables/tables/:tableId/agents",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId } = req.params as { tableId: string };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(req, reply, upstream, `/tables/${tableId}/agents`);
    },
  );

  fastify.all(
    "/tables/tables/:tableId/agents/:agentId",
    { preHandler: authenticateRequest },
    async (req, reply) => {
      const { tableId, agentId } = req.params as {
        tableId: string;
        agentId: string;
      };
      const upstream = await resolveUpstreamForTable(tableId);
      return proxyToUpstream(
        req,
        reply,
        upstream,
        `/tables/${tableId}/agents/${agentId}`,
      );
    },
  );

  // Health/docs passthrough (no auth needed, any pod)
  fastify.get("/tables/health", async (req, reply) => {
    return proxyToUpstream(req, reply, config.tablesServiceUrl, "/health");
  });

  fastify.get("/tables/docs/*", async (req, reply) => {
    const path = req.url.replace(/^\/tables/, "");
    return proxyToUpstream(req, reply, config.tablesServiceUrl, path);
  });

  // ── WebSocket endpoint for real-time table updates ──

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

      // Resolve shard-aware upstream URL
      const upstream = await resolveUpstreamForTable(tableId);
      const upstreamUrl = `${upstream.replace("http", "ws")}/ws/${tableId}`;
      const upstreamWs = new (await import("ws")).WebSocket(upstreamUrl, {
        headers: {
          "x-user-id": authResult.user.id,
          "x-user-email": authResult.user.email,
        },
      });

      // Handle upstream connection
      upstreamWs.on("open", () => {
        fastify.log.info(
          { tableId, userId: authResult.user.id },
          "Upstream WebSocket connected",
        );
      });

      // Forward messages from upstream to client, extracting trace context
      upstreamWs.on("message", (data) => {
        if (socket.readyState === 1) {
          const raw = data.toString();
          try {
            const msg = JSON.parse(raw);
            const traceparent = msg._traceparent;
            delete msg._traceparent;
            const parentCtx = traceparent
              ? propagation.extract(context.active(), { traceparent })
              : context.active();
            tracer.startActiveSpan("ws.forward", {}, parentCtx, (span) => {
              fastify.log.info(
                { message: msg, tableId, direction: "upstream->client" },
                "WS message forwarded",
              );
              socket.send(JSON.stringify(msg));
              span.end();
            });
          } catch {
            // Non-JSON message, forward as-is
            socket.send(raw);
          }
        }
      });

      // Forward messages from client to upstream, injecting trace context
      socket.on("message", (data) => {
        if (upstreamWs.readyState === 1) {
          tracer.startActiveSpan("ws.forward", (span) => {
            try {
              const msg = JSON.parse(data.toString());
              const carrier: Record<string, string> = {};
              propagation.inject(context.active(), carrier);
              msg._traceparent = carrier.traceparent;
              const { _traceparent: _, ...logMsg } = msg;
              fastify.log.info(
                { message: logMsg, tableId, direction: "client->upstream" },
                "WS message forwarded",
              );
              upstreamWs.send(JSON.stringify(msg));
            } finally {
              span.end();
            }
          });
        }
      });

      // Handle upstream close
      upstreamWs.on("close", (code, reason) => {
        fastify.log.info({ tableId, code }, "Upstream WebSocket closed");
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

  // ── Yjs WebSocket proxy ──

  fastify.get("/yjs", { websocket: true }, async (socket, req) => {
    fastify.log.info("[Yjs Proxy] New connection");

    // Authenticate WebSocket connection
    const authResult = await authenticateWebSocket(req);
    if (!authResult.success) {
      fastify.log.warn({ error: authResult.error }, "[Yjs Proxy] Auth failed");
      socket.close(1008, authResult.error);
      return;
    }

    fastify.log.info(
      { userId: authResult.user.id },
      "[Yjs Proxy] Auth success",
    );

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
    upstreamWs.on(
      "message",
      (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        fastify.log.info("[Yjs Proxy] Upstream -> Client");
        if (socket.readyState === 1) {
          // Send as binary buffer for Yjs protocol
          socket.send(data as Buffer);
        }
      },
    );

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
  });
}

// ── Helpers ──

/**
 * Resolve the upstream URL for a tableId by looking up its baseId
 * from the cache (or fetching from tables service on miss).
 */
async function resolveUpstreamForTable(tableId: string): Promise<string> {
  const baseId = await tableBaseCache.resolve(tableId);
  if (!baseId) return config.tablesServiceUrl;
  return getTablesUpstream(baseId);
}

/**
 * Proxy an HTTP request to the given upstream URL + path.
 * Injects user context headers from the authenticated request.
 */
async function proxyToUpstream(
  req: FastifyRequest,
  reply: FastifyReply,
  upstream: string,
  path: string,
): Promise<void> {
  const user = (req as { user?: { email: string } }).user;
  const headers: Record<string, string> = {};

  // Copy relevant headers
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join(", ");
    }
  }

  // Override with user context
  if (user) {
    headers["x-user-id"] = user.email;
    headers["x-user-email"] = user.email;
  }

  // Remove host header (will be set by fetch)
  delete headers.host;

  const url = `${upstream}${path}`;

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };

  // Include body for methods that support it
  if (req.body !== undefined && req.body !== null) {
    fetchOptions.body = JSON.stringify(req.body);
    headers["content-type"] = "application/json";
  }

  const response = await fetch(url, fetchOptions);

  // Forward status code
  reply.status(response.status);

  // Forward response headers
  for (const [key, value] of response.headers.entries()) {
    if (
      key !== "transfer-encoding" &&
      key !== "connection" &&
      key !== "keep-alive"
    ) {
      reply.header(key, value);
    }
  }

  // Forward body
  const body = await response.text();
  return reply.send(body);
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
