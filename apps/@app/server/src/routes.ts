import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { squared } from "@website/squared";
import { PingResponse, SquaredRequest, SquaredResponse } from "./schemas.js";

export async function registerRoutes(
  fastify: FastifyInstance & { withTypeProvider: <T>() => FastifyInstance },
) {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  // Ping endpoint
  app.get(
    "/ping",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["health"],
        response: {
          200: PingResponse,
        },
      },
    },
    async () => {
      return { message: "pong" };
    },
  );

  // Squared endpoint
  app.post(
    "/squared",
    {
      schema: {
        description: "Calculate the square of a number using WASM",
        tags: ["math"],
        body: SquaredRequest,
        response: {
          200: SquaredResponse,
        },
      },
    },
    async (request) => {
      const { number } = request.body;
      const result = squared(request.body.number);
      return { input: number, result };
    },
  );
}
