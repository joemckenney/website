import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      email: string;
      scopes?: string[];
    };
  }
}

export async function extractUserContext(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const email = request.headers["x-user-email"];
  const scopes = request.headers["x-user-scopes"];

  if (!email || typeof email !== "string") {
    return reply.status(401).send({
      error: "Missing or invalid x-user-email header",
      message: "This service must be called through the gateway",
    });
  }

  request.user = {
    email,
    scopes: scopes && typeof scopes === "string" ? scopes.split(",") : [],
  };
}
