import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { config } from "./config.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerBaseRoutes } from "./routes/bases.js";
import { registerColumnRoutes } from "./routes/columns.js";
import { registerRowRoutes } from "./routes/rows.js";
import { registerTableRoutes } from "./routes/tables.js";
import { HealthResponse } from "./schemas.js";

const fastify = Fastify({
  logger: false,
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Tables Service API",
      description: "Dynamic data tables API with memory-first architecture",
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
await registerAgentRoutes(fastify);

// Ready the server (generates the OpenAPI spec)
await fastify.ready();

// Generate OpenAPI spec to local spec folder
const spec = fastify.swagger();
await mkdir("./spec", { recursive: true });
await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));

console.log("OpenAPI spec generated: ./spec/openapi.json");

// Close without starting the server
await fastify.close();
process.exit(0);
