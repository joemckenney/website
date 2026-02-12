import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../config.js";
import { verifyAccessToken } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: {
      email: string;
    };
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Skip authentication for CORS preflight requests
  if (request.method === "OPTIONS") {
    return;
  }

  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return reply
        .status(401)
        .send({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (payload.type !== "access") {
      return reply.status(401).send({ error: "Invalid token type" });
    }

    if (!config.allowedEmails.includes(payload.email.toLowerCase())) {
      return reply.status(403).send({ error: "Access denied" });
    }

    request.user = { email: payload.email };
  } catch (_error) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}
