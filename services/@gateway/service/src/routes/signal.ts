import { assistant, synesthesiaAgent, type CoreMessage } from "@signal/agent";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { type Static, Type } from "typebox";
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

const GestureFeatures = Type.Object({
  strokeCount: Type.Number(),
  avgVelocity: Type.Number(),
  maxVelocity: Type.Number(),
  avgCurvature: Type.Number(),
  totalLength: Type.Number(),
  avgPressure: Type.Number(),
  density: Type.Number(),
  directionality: Type.Number(),
  canvasRegion: Type.String(),
  timeDelta: Type.Number(),
});

const SynesthesiaRequest = Type.Object({
  features: GestureFeatures,
});

const GestureAnalysis = Type.Object({
  mood: Type.String(),
  intensity: Type.Number(),
  pitch_center: Type.String(),
  texture: Type.String(),
  space: Type.String(),
  movement: Type.Number(),
});

const SynesthesiaResponse = Type.Object({
  analysis: GestureAnalysis,
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

  app.post(
    "/signal/synesthesia",
    {
      schema: {
        operationId: "signalSynesthesia",
        description:
          "Analyze drawing gestures and return audio synthesis parameters",
        tags: ["signal"],
        body: SynesthesiaRequest,
        response: {
          200: SynesthesiaResponse,
          500: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { features } = request.body as {
        features: Record<string, number | string>;
      };

      const featuresSummary = Object.entries(features)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const messages: CoreMessage[] = [
        {
          role: "user",
          content: `Analyze this drawing gesture and call set_synth_params: ${featuresSummary}`,
        },
      ];

      const result = await synesthesiaAgent.generate(messages, {
        toolChoice: "required",
      });

      // Extract the tool call arguments from ToolResultChunk
      const toolResult = result.toolResults?.find(
        (t) => t.payload.toolName === "synthParamsTool",
      );

      if (toolResult?.payload.result) {
        return reply.send({
          analysis: toolResult.payload.result as Static<
            typeof GestureAnalysis
          >,
        });
      }

      // Fallback: parse from text if tool call extraction fails
      return reply.status(500).send({
        error: "Failed to extract synesthesia parameters",
      });
    },
  );
}
