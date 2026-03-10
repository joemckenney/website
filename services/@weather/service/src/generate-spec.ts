import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { mkdir, writeFile } from "node:fs/promises";
import { registerStreamRoutes } from "./routes/stream.js";
import { registerWeatherRoutes } from "./routes/weather.js";

const fastify = Fastify({ logger: false }).withTypeProvider<TypeBoxTypeProvider>();

await fastify.register(cors);
await fastify.register(swagger, {
  openapi: {
    info: {
      title: "Weather Station API",
      description:
        "Real-time weather data from Ambient Weather station in Mendocino, CA",
      version: "1.0.0",
    },
    servers: [
      { url: "http://localhost:3004", description: "Development" },
    ],
  },
});

await registerWeatherRoutes(fastify as unknown as Parameters<typeof registerWeatherRoutes>[0]);
await registerStreamRoutes(fastify);

await fastify.ready();
const spec = fastify.swagger();

await mkdir("./spec", { recursive: true });
await writeFile("./spec/openapi.json", JSON.stringify(spec, null, 2));

console.log("OpenAPI spec written to ./spec/openapi.json");
process.exit(0);
