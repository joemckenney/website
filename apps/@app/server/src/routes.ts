import {type FastifyPluginAsync} from "fastify";
import type {TypeBoxTypeProvider} from "@fastify/type-provider-typebox";
import {squared} from "@website/squared";
import {PingResponse, SquaredRequest, SquaredResponse} from "./schemas.js";
import {authenticateRequest} from "./middleware/auth.js";

export const registerRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

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
      return {message: "pong"};
    },
  );

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
      const {number} = request.body;
      const result = squared(number);
      return {input: number as number, result};
    },
  );
};
