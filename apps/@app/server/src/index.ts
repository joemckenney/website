import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {writeFile, mkdir} from "node:fs/promises";
import {registerRoutes} from "./routes.js";
import {registerAuthRoutes} from "./routes/auth.js";
import {TypeBoxTypeProvider} from "@fastify/type-provider-typebox";

const fastify = Fastify({
  logger: {
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

await registerAuthRoutes(fastify);
await registerRoutes(fastify, {});

// Start server
const start = async () => {
  try {
    await fastify.listen({port: 3000, host: "0.0.0.0"});

    // Generate OpenAPI spec to dist folder
    await mkdir("./dist", {recursive: true});
    const spec = fastify.swagger();
    await writeFile("./dist/openapi.json", JSON.stringify(spec, null, 2));

    console.log("Server listening on http://localhost:3000");
    console.log("OpenAPI docs available at http://localhost:3000/docs");
    console.log("OpenAPI spec written to dist/openapi.json");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
