import { mkdir, writeFile } from "node:fs/promises";
import swagger from "@fastify/swagger";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { registerChatRoute } from "./routes/chat.js";
import { registerModelsRoute } from "./routes/models.js";

const fastify = Fastify({
  logger: false,
}).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(swagger, {
  openapi: {
    info: {
      title: "AI Service API",
      description:
        "Multi-provider chat backend (Vercel AI Gateway, Anthropic, Ollama)",
      version: "1.0.0",
    },
  },
});

await registerChatRoute(fastify);
await registerModelsRoute(fastify);

await fastify.ready();

await mkdir("./spec", { recursive: true });
const spec = fastify.swagger();
await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));

console.log("OpenAPI spec written to ./spec/openapi.json");
process.exit(0);
