import { Readable } from "node:stream";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { convertToModelMessages, type LanguageModel, streamText } from "ai";
import type { FastifyInstance } from "fastify";
import { requireGatewayUser } from "../lib/auth.js";
import { isAllowed, resolveModel } from "../lib/providers.js";
import { checkRateLimit } from "../lib/rate-limit.js";
import { ChatRequest, ErrorResponse } from "../schemas.js";

export async function registerChatRoute(
  fastify: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.post(
    "/chat",
    {
      preHandler: requireGatewayUser,
      schema: {
        operationId: "chat",
        tags: ["chat"],
        body: ChatRequest,
        response: {
          400: ErrorResponse,
          401: ErrorResponse,
          403: ErrorResponse,
          429: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = request.user;
      if (!user) {
        return reply.status(401).send({ error: "Unauthenticated" });
      }

      const limit = checkRateLimit(user.email);
      if (!limit.ok) {
        return reply
          .status(429)
          .header("Retry-After", Math.ceil((limit.retryAfterMs ?? 0) / 1000))
          .send({ error: "Rate limit exceeded" });
      }

      const { model: modelId, messages } = request.body;

      if (!isAllowed(modelId)) {
        return reply
          .status(403)
          .send({ error: `Model not allowed: ${modelId}` });
      }

      let model: LanguageModel;
      try {
        model = resolveModel(modelId);
      } catch (err) {
        return reply
          .status(400)
          .send({ error: err instanceof Error ? err.message : "Bad model id" });
      }

      const result = streamText({
        model,
        messages: await convertToModelMessages(messages),
      });
      const response = result.toUIMessageStreamResponse();

      // Hijack the reply so we can stream the Web Response body straight to
      // the raw socket without fighting Fastify's response-type narrowing.
      reply.hijack();
      reply.raw.statusCode = response.status;
      response.headers.forEach((value, key) => {
        reply.raw.setHeader(key, value);
      });

      if (!response.body) {
        reply.raw.end();
        return;
      }

      Readable.fromWeb(response.body as never).pipe(reply.raw);
    },
  );
}
