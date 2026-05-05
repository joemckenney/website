import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the AI service.
 * All requests to /ai/* are forwarded with the authenticated user context
 * injected as an x-user header. Streaming responses pass through
 * automatically via @fastify/http-proxy.
 */
export async function registerAiRoutes(fastify: FastifyInstance) {
  await fastify.register(httpProxy, {
    upstream: config.aiServiceUrl,
    prefix: "/ai",
    rewritePrefix: "",
    preHandler: authenticateRequest,
    replyOptions: {
      rewriteRequestHeaders: (originalRequest, headers) => {
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

        return newHeaders;
      },
    },
  });
}
