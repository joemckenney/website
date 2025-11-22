import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { squared } from "@website/squared";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";
import { authenticateRequest } from "./middleware/auth.js";

export const registerRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    "/ping",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["health"],
        response: {
          200: Type.Object({
            message: Type.String({ description: "Response message" }),
          }),
        },
      },
    },
    async () => {
      return { message: "pong" };
    },
  );

  app.post(
    "/squared",
    {
      preHandler: authenticateRequest,
      schema: {
        description: "Calculate the square of a number using WASM",
        tags: ["math"],
        security: [{ bearerAuth: [] }],
        body: Type.Object({
          number: Type.Number({ description: "The number to square" }),
        }),
        response: {
          200: Type.Object({
            input: Type.Number({ description: "The input number" }),
            result: Type.Number({ description: "The squared result" }),
          }),
        },
      },
    },
    async (request) => {
      const { number } = request.body;
      const result = squared(number);
      return { input: number, result };
    },
  );
};
