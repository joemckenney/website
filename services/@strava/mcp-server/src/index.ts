import "dotenv/config";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import metricsPlugin from "fastify-metrics";
import { config } from "./config.js";
import { registerMcpRoutes } from "./mcp/transport.js";
import { registerOAuthRoutes } from "./oauth/routes.js";

const fastify = Fastify({
  logger:
    process.env.NODE_ENV === "production"
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

await fastify.register(cookie);

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

// Health check endpoint
fastify.get("/ping", async () => {
  return { status: "ok", service: "strava-mcp-server" };
});

// Register routes with /strava prefix (gateway forwards /strava/* here)
await fastify.register(
  async (instance) => {
    await registerOAuthRoutes(instance);
    await registerMcpRoutes(instance);
  },
  { prefix: "/strava" },
);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });
    console.log(
      `Strava MCP Server listening on http://localhost:${config.port}`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
