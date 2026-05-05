import type { FastifyReply, FastifyRequest } from "fastify";

export interface GatewayUser {
  id: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: GatewayUser;
  }
}

/**
 * preHandler that reads the x-user header injected by the gateway's
 * authenticated proxy. The gateway is the only thing that should be
 * able to reach this service in a deployed environment; we trust the
 * header it sends.
 */
export async function requireGatewayUser(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const raw = request.headers["x-user"];
  if (typeof raw !== "string" || !raw) {
    return reply.status(401).send({ error: "Missing x-user header" });
  }
  try {
    const user = JSON.parse(raw) as GatewayUser;
    if (!user.email) {
      return reply.status(401).send({ error: "Invalid x-user payload" });
    }
    request.user = user;
  } catch {
    return reply.status(401).send({ error: "Malformed x-user header" });
  }
}
