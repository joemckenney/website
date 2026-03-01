import { assistant, type CoreMessage } from "@signal/agent";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ErrorResponse } from "../schemas.js";
import { authenticateRequest } from "../middleware/auth.js";

const MessageSchema = Type.Object({
  role: Type.Union([Type.Literal("user"), Type.Literal("assistant")]),
  content: Type.String(),
});

const GenerateRequest = Type.Object({
  messages: Type.Array(MessageSchema, { minItems: 1 }),
});

const GenerateResponse = Type.Object({
  text: Type.String({ description: "Generated response text" }),
  model: Type.String({ description: "Model used for generation" }),
});

const HealthResponse = Type.Object({
  status: Type.String({ description: "Service health status" }),
});

export async function registerSignalRoutes(
  fastify: FastifyInstance & { withTypeProvider: <_T>() => FastifyInstance },
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    "/signal/health",
    {
      schema: {
        operationId: "signalHealth",
        description: "Check Signal agent health",
        tags: ["signal"],
        response: {
          200: HealthResponse,
        },
      },
    },
    async (_request, reply) => {
      return reply.send({ status: "ok" });
    },
  );

  app.post(
    "/signal/generate",
    {
      schema: {
        operationId: "signalGenerate",
        description: "Generate a response from the Signal assistant",
        tags: ["signal"],
        security: [{ bearerAuth: [] }],
        body: GenerateRequest,
        response: {
          200: GenerateResponse,
          401: ErrorResponse,
          500: ErrorResponse,
        },
      },
      preHandler: authenticateRequest,
    },
    async (request, reply) => {
      const { messages } = request.body as { messages: CoreMessage[] };

      const result = await assistant.generate(messages);

      return reply.send({
        text: result.text,
        model: result.response?.modelId ?? "unknown",
      });
    },
  );

  app.post(
    "/signal/stream",
    {
      schema: {
        operationId: "signalStream",
        description: "Stream a response from the Signal assistant via SSE",
        tags: ["signal"],
        security: [{ bearerAuth: [] }],
        body: GenerateRequest,
        response: {
          401: ErrorResponse,
          500: ErrorResponse,
        },
      },
      preHandler: authenticateRequest,
    },
    async (request, reply) => {
      const { messages } = request.body as { messages: CoreMessage[] };

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      const result = await assistant.stream(messages);

      for await (const chunk of result.textStream) {
        reply.raw.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      reply.raw.write("data: [DONE]\n\n");
      reply.raw.end();
    },
  );
}
