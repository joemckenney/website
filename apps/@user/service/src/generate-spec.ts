import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { registerUserRoutes } from "./routes/users.js";

const fastify = Fastify({
  logger: false, // Disable logging for spec generation
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "User Service API",
      description: "User management service",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3002",
        description: "Development server",
      },
    ],
  },
});

// Register routes (but don't start server)
await fastify.register(registerUserRoutes);

// Ready the server (generates the OpenAPI spec)
await fastify.ready();

// Generate OpenAPI spec to dist folder
await mkdir("./dist", { recursive: true });
const spec = fastify.swagger();
await writeFile("./dist/openapi.json", JSON.stringify(spec, null, 2));

console.log("✅ OpenAPI spec generated: dist/openapi.json");

// Close without starting the server
await fastify.close();
process.exit(0);
