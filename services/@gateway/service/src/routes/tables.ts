import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the tables service.
 * All requests to /tables/* are forwarded to the tables service
 * with the authenticated user context.
 *
 * Uses @fastify/http-proxy for automatic proxying.
 */
export async function registerTablesRoutes(fastify: FastifyInstance) {
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
        const user = (originalRequest as { user?: { id: string; email: string } }).user;
        if (user) {
          return {
            ...headers,
            "x-user-id": user.id,
            "x-user-email": user.email,
          };
        }
        return headers;
      },
    },
  });
}
