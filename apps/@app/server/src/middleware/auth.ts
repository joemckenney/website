import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../lib/jwt.js';
import { config } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      email: string;
    };
  }
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (payload.type !== 'access') {
      return reply.status(401).send({ error: 'Invalid token type' });
    }

    if (payload.email !== config.allowedEmail) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    request.user = { email: payload.email };
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
