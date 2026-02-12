import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { getTablesUpstream } from "../lib/tables-router.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the agent service.
 * All requests to /agent/* are forwarded to the agent service
 * with the authenticated user context.
 *
 * Uses @fastify/http-proxy for automatic proxying - no need to manually
 * define routes for each endpoint. SSE streaming works automatically.
 */
export async function registerAgentRoutes(fastify: FastifyInstance) {
  await fastify.register(httpProxy, {
    upstream: config.agentServiceUrl,
    prefix: "/agent",
    rewritePrefix: "",
    // Authenticate all requests before proxying
    preHandler: authenticateRequest,
    // Add user context header to proxied requests
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => {
        // Get user from request (set by authenticateRequest)
        const user = (originalRequest as { user?: { email: string } }).user;
        const newHeaders: Record<string, string | string[] | undefined> = {
          ...headers,
        };

        if (user) {
          newHeaders["x-user"] = JSON.stringify({
            id: user.email,
            email: user.email,
          });
        }

        // Compute shard-specific tables service URL for MCP connections.
        // The agent service uses this to route MCP SSE + POST to the same pod.
        const baseId = headers["x-base-id"] as string | undefined;
        if (baseId) {
          newHeaders["x-tables-shard-url"] = getTablesUpstream(baseId);
        }

        return newHeaders;
      },
    },
  });
}
