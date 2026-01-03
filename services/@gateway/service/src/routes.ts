import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyPluginAsync } from "fastify";
import { Type } from "typebox";

export const registerRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<TypeBoxTypeProvider>();

  app.get(
    "/ping",
    {
      schema: {
        operationId: "ping",
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
};
