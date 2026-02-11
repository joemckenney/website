import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { tracingMixin } from "@website/tracing";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";
import { Type } from "typebox";
import { config } from "./config.js";
import { registerUserRoutes } from "./routes/users.js";
import { HealthResponse } from "./schemas.js";

const fastify = Fastify({
  disableRequestLogging: true,
  logger:
    config.nodeEnv === "production"
      ? { mixin: tracingMixin }
      : {
          mixin: tracingMixin,
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              colorize: true,
            },
          },
        },
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

// Prometheus metrics endpoint at /metrics
// eslint-disable-next-line @typescript-eslint/no-explicit-any
await fastify.register(metricsPlugin as any, {
  endpoint: "/metrics",
  defaultMetrics: { enabled: true },
  routeMetrics: { enabled: true },
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "User Service API",
      description: "Internal user management API",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
    ],
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/docs",
});

// Health check endpoint
fastify.get(
  "/health",
  {
    schema: {
      operationId: "healthCheck",
      description: "Health check endpoint",
      tags: ["health"],
      response: {
        200: HealthResponse,
      },
    },
  },
  async () => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  },
);

// Register user routes
await registerUserRoutes(fastify);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });

    // Generate OpenAPI spec to local spec folder (development only)
    if (config.nodeEnv !== "production") {
      const spec = fastify.swagger();
      await mkdir("./spec", { recursive: true });
      await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));
      console.log("OpenAPI spec written to ./spec/openapi.json");
    }

    console.log(`Server listening on http://localhost:${config.port}`);
    console.log(
      `OpenAPI docs available at http://localhost:${config.port}/docs`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
