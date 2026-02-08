import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";
import { registerAgentRoutes } from "./routes/agent.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerStravaRoutes } from "./routes/strava.js";
import { registerTablesRoutes } from "./routes/tables.js";
import { registerRoutes } from "./routes.js";

const fastify = Fastify({
  logger:
    process.env.NODE_ENV === "production"
      ? true // JSON logging in production
      : {
          // Pretty logging in development
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

await fastify.register(cookie);

await fastify.register(cors, {
  origin: true, // Allow all origins in development
  credentials: true, // Allow cookies to be sent
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false, // Don't pass preflight to next handler
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
      title: "Squared API",
      description: "API with ping and squared endpoints using WASM",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT access token obtained from /auth/google flow",
        },
      },
    },
  },
});

await fastify.register(swaggerUi, {
  routePrefix: "/docs",
});

// WebSocket support for real-time features
await fastify.register(websocket);

await registerAuthRoutes(fastify);
await registerAgentRoutes(fastify);
await registerStravaRoutes(fastify);
await registerTablesRoutes(fastify);
await registerRoutes(fastify, {});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });

    // Generate OpenAPI spec to local spec folder (development only)
    if (process.env.NODE_ENV !== "production") {
      const spec = fastify.swagger();
      await mkdir("./spec", { recursive: true });
      await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));
      console.log("OpenAPI spec written to ./spec/openapi.json");
    }

    console.log("Server listening on http://localhost:3000");
    console.log("OpenAPI docs available at http://localhost:3000/docs");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
