import "dotenv/config";

import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";

import { config } from "./config.js";
import { backfill, gapFill } from "./lib/awn-backfill.js";
import { startConnector } from "./lib/awn-connector.js";
import { registerStreamRoutes } from "./routes/stream.js";
import { registerWeatherRoutes } from "./routes/weather.js";

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

// Plugins
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
      title: "Weather Station API",
      description: "Real-time weather data from Ambient Weather station in Mendocino, CA",
      version: "1.0.0",
    },
    servers: [
      { url: `http://localhost:${config.port}`, description: "Development" },
    ],
  },
});
await fastify.register(swaggerUi, { routePrefix: "/docs" });

// Health check
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

// Routes
await registerWeatherRoutes(fastify as unknown as Parameters<typeof registerWeatherRoutes>[0]);
await registerStreamRoutes(fastify);

// Start server
try {
  await fastify.listen({ port: config.port, host: "0.0.0.0" });
  fastify.log.info(`Weather service listening on port ${config.port}`);
  fastify.log.info(`OpenAPI docs: http://localhost:${config.port}/docs`);

  // Generate OpenAPI spec in development
  if (config.nodeEnv !== "production") {
    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir("./spec", { recursive: true });
    const spec = fastify.swagger();
    await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));
    fastify.log.info("OpenAPI spec written to ./spec/openapi.json");
  }

  // Fill any gaps from connector downtime, then start real-time connector
  gapFill(fastify.log).catch((err) => {
    fastify.log.error({ err }, "Gap-fill failed");
  });
  startConnector(fastify.log);

  // Run gap-fill periodically (every 30 minutes) as a safety net
  setInterval(() => {
    gapFill(fastify.log).catch((err) => {
      fastify.log.error({ err }, "Periodic gap-fill failed");
    });
  }, 30 * 60 * 1000);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
