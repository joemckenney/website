import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";

/**
 * Internal routes for cluster-internal communication.
 * No auth — only reachable within the Kubernetes cluster.
 */
export async function registerInternalRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Resolve tableId → baseId (used by gateway for shard routing)
  fastify.get(
    "/internal/table-base/:tableId",
    {
      schema: {
        operationId: "getTableBase",
        description:
          "Get the baseId for a table. Cluster-internal, no auth required.",
        tags: ["internal"],
        params: Type.Object({
          tableId: Type.String({ format: "uuid" }),
        }),
        response: {
          200: Type.Object({
            tableId: Type.String(),
            baseId: Type.String(),
          }),
          404: Type.Object({ error: Type.String() }),
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;

      const meta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
        select: { id: true, baseId: true },
      });

      if (!meta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      return { tableId: meta.id, baseId: meta.baseId };
    },
  );
}
