import "dotenv/config";

import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";

import { config } from "./config.js";
import { registerChatRoute } from "./routes/chat.js";
import { registerModelsRoute } from "./routes/models.js";

let tracingMixin: (() => object) | undefined;
try {
  const tracing = await import("@website/tracing");
  tracingMixin = tracing.tracingMixin;
} catch {
  // tracing not available
}

const fastify = Fastify({
  logger:
    config.nodeEnv === "production"
      ? { mixin: tracingMixin }
      : {
          transport: {
            target: "pino-pretty",
            options: { colorize: true },
          },
        },
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(cors, { origin: true, credentials: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await fastify.register(metricsPlugin as any, {
  endpoint: "/metrics",
  defaultMetrics: { enabled: true },
  routeMetrics: { enabled: true },
});
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "AI Service API",
      description:
        "Multi-provider chat backend (Vercel AI Gateway, Anthropic, Ollama)",
      version: "1.0.0",
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: "Development" },
    ],
  },
});
await fastify.register(swaggerUi, { routePrefix: "/docs" });

fastify.get(
  "/health",
  {
    schema: {
      operationId: "healthCheck",
      tags: ["system"],
      response: {
        200: {
          type: "object",
          properties: {
            status: { type: "string" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }),
);

await registerChatRoute(fastify);
await registerModelsRoute(fastify);

try {
  await fastify.listen({ port: config.port, host: "0.0.0.0" });
  fastify.log.info(`AI service listening on port ${config.port}`);
  fastify.log.info(`OpenAPI docs: http://localhost:${config.port}/docs`);
  fastify.log.info(
    `Allowed models: ${config.allowedModels.join(", ") || "(none — set ALLOWED_MODELS)"}`,
  );

  if (config.nodeEnv !== "production") {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir("./spec", { recursive: true });
    const spec = fastify.swagger();
    await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));
    fastify.log.info("OpenAPI spec written to ./spec/openapi.json");
  }
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
