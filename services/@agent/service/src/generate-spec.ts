import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { config } from "./config.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerConversationRoutes } from "./routes/conversations.js";
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
      title: "Agent Service API",
      description:
        "AI Agent service with conversation management and streaming",
      version: "1.0.0",
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
    ],
    tags: [
      { name: "health", description: "Health check endpoints" },
      { name: "conversations", description: "Conversation management" },
      { name: "chat", description: "Chat with the AI agent" },
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
await registerConversationRoutes(fastify);
await registerChatRoutes(fastify);

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
