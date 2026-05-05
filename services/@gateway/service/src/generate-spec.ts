import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerWeatherRoutes } from "./routes/weather.js";
import { registerRoutes } from "./routes.js";

const fastify = Fastify({
  logger: false, // Disable logging for spec generation
}).withTypeProvider<TypeBoxTypeProvider>();

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

// Register routes (but don't start server)
await registerAuthRoutes(fastify);
await registerWeatherRoutes(fastify);
await registerRoutes(fastify, {});

// Ready the server (generates the OpenAPI spec)
await fastify.ready();

// Generate OpenAPI spec to local spec folder
const spec = fastify.swagger();
await mkdir("./spec", { recursive: true });
await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));

console.log("✅ OpenAPI spec generated: ./spec/openapi.json");

// Close without starting the server
await fastify.close();
process.exit(0);
