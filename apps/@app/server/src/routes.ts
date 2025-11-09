import type { FastifyInstance } from "fastify";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { squared } from "@website/squared";
import { PingResponse, SquaredRequest, SquaredResponse } from "./schemas.js";
import { authenticateRequest } from "./middleware/auth.js";

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

  // Squared endpoint (protected - requires authentication)
  app.post(
    "/squared",
    {
      preHandler: authenticateRequest,
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
      // Type assertion safe due to schema validation
      const result = squared(number as number);
      return { input: number as number, result };
    },
  );
}
