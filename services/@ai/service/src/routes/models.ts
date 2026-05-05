import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { ModelsResponse } from "../schemas.js";

export async function registerModelsRoute(fastify: FastifyInstance) {
  fastify.get(
    "/models",
    {
      schema: {
        operationId: "listModels",
        tags: ["models"],
        response: {
          200: ModelsResponse,
        },
      },
    },
    async () => ({
      models: config.allowedModels.map((id) => ({
        id,
        provider: id.split("/")[0] ?? "unknown",
      })),
    }),
  );
}
