import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { config } from "./config.js";
import { prisma } from "./db/client.js";
import { registerUserRoutes } from "./routes/users.js";

const fastify = Fastify({
  logger:
    config.nodeEnv === "production"
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

await fastify.register(cors, {
  origin: true,
  credentials: true,
});

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

await fastify.register(swaggerUi, {
  routePrefix: "/docs",
});

// Health check
fastify.get("/health", async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "healthy", database: "connected" };
  } catch (error) {
    return { status: "unhealthy", database: "disconnected" };
  }
});

await fastify.register(registerUserRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: "0.0.0.0" });

    // Generate OpenAPI spec (development only)
    if (config.nodeEnv !== "production") {
      await mkdir("./dist", { recursive: true });
      const spec = fastify.swagger();
      await writeFile("./dist/openapi.json", JSON.stringify(spec, null, 2));
      console.log("OpenAPI spec written to dist/openapi.json");
    }

    console.log(`Server listening on http://localhost:${config.port}`);
    console.log(
      `OpenAPI docs available at http://localhost:${config.port}/docs`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
