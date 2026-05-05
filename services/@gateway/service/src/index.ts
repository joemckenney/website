import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import websocket from "@fastify/websocket";
import { tracingMixin } from "@website/tracing";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";
import { registerAiRoutes } from "./routes/ai.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWeatherRoutes } from "./routes/weather.js";
import { registerRoutes } from "./routes.js";

const fastify = Fastify({
  disableRequestLogging: true,
  logger:
    process.env.NODE_ENV === "production"
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

await fastify.register(cookie);

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  "http://localhost:3001,http://localhost:5173,https://www.crowprose.com,https://app.crowprose.com"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

await fastify.register(cors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
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
await registerAiRoutes(fastify);
await registerWeatherRoutes(fastify);
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
