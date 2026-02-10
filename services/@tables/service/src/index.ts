import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";
import { config } from "./config.js";
import { registerMcpRoutes } from "./mcp/transport.js";
import { registerBaseRoutes } from "./routes/bases.js";
import { registerColumnRoutes } from "./routes/columns.js";
import { registerRowRoutes } from "./routes/rows.js";
import { registerTableRoutes } from "./routes/tables.js";
import { registerWebSocketRoutes } from "./routes/websocket.js";
import { HealthResponse } from "./schemas.js";
import { memoryStore } from "./store/memory.js";
import { Materializer } from "./store/materializer.js";

const fastify = Fastify({
  logger:
    config.nodeEnv === "production"
      ? true
      : {
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
await fastify.register(
  metricsPlugin as unknown as Parameters<typeof fastify.register>[0],
  {
    endpoint: "/metrics",
    defaultMetrics: { enabled: true },
    routeMetrics: { enabled: true },
  },
);

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Tables Service API",
      description:
        "Dynamic data tables API with WAL + in-memory SQLite architecture",
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

// WebSocket support for real-time updates
await fastify.register(websocket);

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

// Register routes
await registerBaseRoutes(fastify);
await registerTableRoutes(fastify);
await registerColumnRoutes(fastify);
await registerRowRoutes(fastify);
await registerMcpRoutes(fastify);
await registerWebSocketRoutes(fastify);

// Initialize materializer (singleton for PostgreSQL sync)
const materializer = new Materializer();

// Start server
const start = async () => {
  try {
    // Initialize memory store from WAL
    await memoryStore.initialize();

    // Start PostgreSQL materializer background worker
    materializer.start();

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

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down...");
  materializer.stop();
  await fastify.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("Received SIGINT, shutting down...");
  materializer.stop();
  await fastify.close();
  process.exit(0);
});

start();
