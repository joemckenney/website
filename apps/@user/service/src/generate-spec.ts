import "dotenv/config";
import { writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { Type } from "typebox";
import { config } from "./config.js";
import { registerUserRoutes } from "./routes/users.js";
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

// Ready the server (generates the OpenAPI spec)
await fastify.ready();

// Generate OpenAPI spec to @user/spec folder
const spec = fastify.swagger();
await writeFile("../spec/openapi.json", JSON.stringify(spec, null, 2));

console.log("OpenAPI spec generated: ../spec/openapi.json");

// Close without starting the server
await fastify.close();
process.exit(0);
