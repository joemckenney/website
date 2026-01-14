import type { ServerResponse } from "node:http";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import { decrypt, encrypt } from "../db/crypto.js";
import { refreshAccessToken } from "../oauth/client.js";
import { getToolDefinitions, handleToolCall } from "./tools.js";

const ErrorResponse = Type.Object({
  error: Type.String(),
});

/**
 * Store active SSE connections by user ID
 */
const sseConnections = new Map<string, ServerResponse>();

/**
 * Get valid access token for user, refreshing if needed
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
  });

  if (!connection) {
    return null;
  }

  // Check if token is expired or about to expire (5 min buffer)
  const now = new Date();
  const expiresAt = new Date(connection.expiresAt);
  const bufferMs = 5 * 60 * 1000; // 5 minutes

  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    // Token is still valid
    return decrypt(connection.accessToken);
  }

  // Token expired or expiring soon - refresh it
  try {
    const refreshToken = decrypt(connection.refreshToken);
    const newTokens = await refreshAccessToken(refreshToken);

    // Update tokens in database
    await prisma.stravaConnection.update({
      where: { userId },
      data: {
        accessToken: encrypt(newTokens.access_token),
        refreshToken: encrypt(newTokens.refresh_token),
        expiresAt: new Date(newTokens.expires_at * 1000),
      },
    });

    return newTokens.access_token;
  } catch (error) {
    console.error("Failed to refresh Strava token:", error);
    return null;
  }
}

/**
 * MCP JSON-RPC request structure
 * Note: id is optional for notifications
 */
interface McpRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC response structure
 * Note: id is optional for responses to notifications
 */
interface McpResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Send a JSON-RPC response over the SSE connection
 */
function sendSseResponse(userId: string, response: McpResponse): boolean {
  const sseConnection = sseConnections.get(userId);
  if (!sseConnection) {
    console.log(`[MCP SSE] No SSE connection found for user: ${userId}`);
    return false;
  }

  const sseMessage = `event: message\ndata: ${JSON.stringify(response)}\n\n`;
  console.log(
    `[MCP SSE] Sending response on SSE stream:`,
    JSON.stringify(response).slice(0, 200),
  );
  sseConnection.write(sseMessage);
  return true;
}

export async function registerMcpRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // MCP message endpoint (JSON-RPC over HTTP)
  // In SSE transport, responses are sent on the SSE stream
  fastify.post(
    "/mcp/message",
    {
      schema: {
        operationId: "mcpMessage",
        description: "Handle MCP JSON-RPC request",
        tags: ["mcp"],
        headers: Type.Object({
          "x-user-id": Type.String(),
        }),
        body: Type.Object({
          jsonrpc: Type.Literal("2.0"),
          id: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          method: Type.String(),
          params: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
        }),
        response: {
          202: Type.Object({}),
          401: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const userId = request.headers["x-user-id"];
      const mcpRequest = request.body as McpRequest;

      console.log(`[MCP MESSAGE] ====== Incoming request ======`);
      console.log(`[MCP MESSAGE] Method: ${mcpRequest.method}`);
      console.log(`[MCP MESSAGE] ID: ${mcpRequest.id}`);
      console.log(`[MCP MESSAGE] User: ${userId}`);
      console.log(
        `[MCP MESSAGE] Params:`,
        JSON.stringify(mcpRequest.params || {}, null, 2),
      );

      // For tools/call, we need a valid access token
      // For other methods, we can proceed without it
      let accessToken: string | null = null;
      if (mcpRequest.method === "tools/call") {
        accessToken = await getValidAccessToken(userId);
        if (!accessToken) {
          return reply.status(401).send({
            error: "Strava not connected or token refresh failed",
          });
        }
      }

      // Handle MCP methods
      let response: McpResponse;

      switch (mcpRequest.method) {
        case "initialize": {
          // Echo back the client's protocol version for compatibility
          const clientProtocolVersion =
            (mcpRequest.params?.protocolVersion as string) || "2024-11-05";
          response = {
            jsonrpc: "2.0",
            id: mcpRequest.id,
            result: {
              protocolVersion: clientProtocolVersion,
              capabilities: {
                tools: {},
              },
              serverInfo: {
                name: "strava-mcp-server",
                version: "1.0.0",
              },
            },
          };
          console.log(
            `[MCP MESSAGE] Initialize response (protocol: ${clientProtocolVersion}):`,
            JSON.stringify(response.result, null, 2),
          );
          break;
        }

        case "notifications/initialized":
        case "initialized":
          // Client acknowledges initialization - no response needed for notifications
          console.log(`[MCP MESSAGE] Client initialized notification received`);
          // Notifications don't need responses, just acknowledge the HTTP request
          return reply.status(202).send({});

        case "tools/list": {
          const tools = getToolDefinitions();
          response = {
            jsonrpc: "2.0",
            id: mcpRequest.id,
            result: {
              tools,
            },
          };
          console.log(
            `[MCP MESSAGE] Tools/list response - ${tools.length} tools:`,
            tools.map((t) => t.name),
          );
          break;
        }

        case "tools/call": {
          const toolName = mcpRequest.params?.name as string;
          const toolArgs = mcpRequest.params?.arguments as Record<
            string,
            unknown
          >;
          console.log(
            `[MCP] Tool call: ${toolName}`,
            JSON.stringify(toolArgs, null, 2),
          );

          try {
            const result = await handleToolCall(
              toolName,
              toolArgs,
              accessToken!,
            );
            console.log(
              `[MCP] Tool result:`,
              JSON.stringify(result, null, 2).slice(0, 500),
            );
            response = {
              jsonrpc: "2.0",
              id: mcpRequest.id,
              result: {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              },
            };
          } catch (error) {
            response = {
              jsonrpc: "2.0",
              id: mcpRequest.id,
              error: {
                code: -32603,
                message:
                  error instanceof Error
                    ? error.message
                    : "Tool execution failed",
              },
            };
          }
          break;
        }

        default:
          console.log(`[MCP MESSAGE] Unknown method: ${mcpRequest.method}`);
          response = {
            jsonrpc: "2.0",
            id: mcpRequest.id,
            error: {
              code: -32601,
              message: `Method not found: ${mcpRequest.method}`,
            },
          };
      }

      // Send response on SSE stream
      const sent = sendSseResponse(userId, response);
      if (!sent) {
        console.log(
          `[MCP MESSAGE] Warning: Could not send response on SSE stream, sending via HTTP`,
        );
        // Fallback to HTTP response if SSE connection not found
        return reply.send(response);
      }

      // Return 202 Accepted - response will be sent on SSE stream
      return reply.status(202).send({});
    },
  );

  // SSE endpoint for MCP transport
  fastify.get(
    "/mcp/sse",
    {
      schema: {
        operationId: "mcpSSE",
        description: "SSE stream for MCP transport",
        tags: ["mcp"],
        headers: Type.Object({
          "x-user-id": Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const userId = request.headers["x-user-id"];
      console.log(`[MCP SSE] Connection opened for user: ${userId}`);
      console.log(
        `[MCP SSE] Request headers:`,
        JSON.stringify(request.headers, null, 2),
      );

      // Set SSE headers
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });

      // Store this connection for sending responses
      sseConnections.set(userId, reply.raw);
      console.log(`[MCP SSE] Stored SSE connection for user: ${userId}`);

      // Send MCP endpoint event - tells the client where to POST JSON-RPC messages
      // This is required by the MCP SSE transport specification
      const endpointUrl = "/strava/mcp/message";
      console.log(`[MCP SSE] Sending endpoint event: ${endpointUrl}`);
      reply.raw.write(`event: endpoint\ndata: ${endpointUrl}\n\n`);

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        reply.raw.write(": heartbeat\n\n");
      }, 30000);

      // Clean up on close
      request.raw.on("close", () => {
        console.log(`[MCP SSE] Connection closed for user: ${userId}`);
        clearInterval(heartbeat);
        sseConnections.delete(userId);
      });
    },
  );
}
