import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { authenticateRequest } from "../middleware/auth.js";

/**
 * Proxy routes for the agent service.
 * All requests to /agent/* are forwarded to the agent service
 * with the authenticated user context.
 */
export async function registerAgentRoutes(fastify: FastifyInstance) {
  // Helper to get user ID - for now we use email as ID
  // In production, you'd look up the user in the users service
  const getUserContext = (request: { user?: { email: string } }) => {
    if (!request.user) {
      throw new Error("User not authenticated");
    }
    return {
      id: request.user.email, // Using email as user ID
      email: request.user.email,
    };
  };

  // Proxy conversations endpoints
  fastify.post(
    "/agent/conversations",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);

      const response = await fetch(`${config.agentServiceUrl}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User": JSON.stringify(user),
        },
        body: JSON.stringify(request.body),
      });

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  fastify.get(
    "/agent/conversations",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);
      const queryString = new URLSearchParams(
        request.query as Record<string, string>
      ).toString();

      const response = await fetch(
        `${config.agentServiceUrl}/conversations${queryString ? `?${queryString}` : ""}`,
        {
          headers: {
            "X-User": JSON.stringify(user),
          },
        }
      );

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  fastify.get(
    "/agent/conversations/:id",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);
      const { id } = request.params as { id: string };

      const response = await fetch(
        `${config.agentServiceUrl}/conversations/${id}`,
        {
          headers: {
            "X-User": JSON.stringify(user),
          },
        }
      );

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  fastify.patch(
    "/agent/conversations/:id",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);
      const { id } = request.params as { id: string };

      const response = await fetch(
        `${config.agentServiceUrl}/conversations/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-User": JSON.stringify(user),
          },
          body: JSON.stringify(request.body),
        }
      );

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  fastify.delete(
    "/agent/conversations/:id",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);
      const { id } = request.params as { id: string };

      const response = await fetch(
        `${config.agentServiceUrl}/conversations/${id}`,
        {
          method: "DELETE",
          headers: {
            "X-User": JSON.stringify(user),
          },
        }
      );

      if (response.status === 204) {
        return reply.status(204).send();
      }

      const data = await response.json();
      return reply.status(response.status).send(data);
    }
  );

  // Chat endpoint with SSE streaming
  fastify.post(
    "/agent/conversations/:id/chat",
    { preHandler: authenticateRequest },
    async (request, reply) => {
      const user = getUserContext(request);
      const { id } = request.params as { id: string };

      const response = await fetch(
        `${config.agentServiceUrl}/conversations/${id}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User": JSON.stringify(user),
          },
          body: JSON.stringify(request.body),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        return reply.status(response.status).send(data);
      }

      // Stream SSE response through
      // Must manually add CORS headers since we're using raw response
      const origin = request.headers.origin || "*";
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
      });

      if (!response.body) {
        reply.raw.end();
        return;
      }

      const reader = response.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          reply.raw.write(value);
        }
      } catch (error) {
        fastify.log.error({ err: error }, "SSE stream error");
      } finally {
        reply.raw.end();
      }
    }
  );
}
