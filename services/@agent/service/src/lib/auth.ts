import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * User context passed from the gateway
 */
export interface UserContext {
  id: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: UserContext;
  }
}

/**
 * Middleware to extract user context from X-User header
 * The gateway forwards authenticated user info in this header
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userHeader = request.headers["x-user"];

  if (!userHeader || typeof userHeader !== "string") {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    request.user = JSON.parse(userHeader) as UserContext;
  } catch {
    return reply.status(401).send({ error: "Invalid user context" });
  }
}

/**
 * Get user from request, throwing if not authenticated
 */
export function getUser(request: FastifyRequest): UserContext {
  if (!request.user) {
    throw new Error("User not authenticated");
  }
  return request.user;
}
