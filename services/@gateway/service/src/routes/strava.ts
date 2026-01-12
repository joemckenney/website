import httpProxy from "@fastify/http-proxy";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the Strava MCP service.
 * All requests to /strava/* are forwarded to the Strava MCP server
 * with the authenticated user context.
 *
 * Exception: /strava/auth/callback is public (OAuth redirect from Strava)
 */
export async function registerStravaRoutes(fastify: FastifyInstance) {
  // OAuth callback - public route (Strava redirects here without auth)
  fastify.get("/strava/auth/callback", async (request: FastifyRequest, reply: FastifyReply) => {
    // Forward to Strava MCP service
    const url = new URL(request.url, `http://${request.headers.host}`);
    const targetUrl = `${config.stravaServiceUrl}/strava/auth/callback${url.search}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "manual", // Don't follow redirects, let the browser handle it
    });

    // If it's a redirect, pass it through
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        return reply.redirect(location);
      }
    }

    // Otherwise return the response
    return reply.status(response.status).send(await response.text());
  });

  // All other Strava routes - require authentication
  await fastify.register(httpProxy, {
    upstream: config.stravaServiceUrl,
    prefix: "/strava",
    rewritePrefix: "/strava",
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
            "x-user-id": user.email,
          };
        }
        return headers;
      },
    },
  });
}
