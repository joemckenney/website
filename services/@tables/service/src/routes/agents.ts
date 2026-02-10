import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { agentRunner } from "../agents/runner.js";
import { prisma } from "../db/client.js";
import {
  AgentIdParams,
  ErrorResponse,
  TableAgentSchema,
  TableIdParams,
  ToggleAgentBody,
} from "../schemas.js";

export async function registerAgentRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // List agents for a table
  fastify.get(
    "/tables/:tableId/agents",
    {
      schema: {
        operationId: "listTableAgents",
        description: "List all AI automation agents for a table",
        tags: ["agents"],
        params: TableIdParams,
        response: {
          200: Type.Array(TableAgentSchema),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const agents = await prisma.tableAgent.findMany({
        where: { tableId },
        orderBy: { createdAt: "asc" },
      });

      return agents.map((a) => ({
        id: a.id,
        tableId: a.tableId,
        name: a.name,
        enabled: a.enabled,
        triggerType: a.triggerType,
        watchColumns: a.watchColumns,
        inputColumns: a.inputColumns,
        outputColumns: a.outputColumns,
        prompt: a.prompt,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    },
  );

  // Toggle agent enabled state
  fastify.patch(
    "/tables/:tableId/agents/:agentId/toggle",
    {
      schema: {
        operationId: "toggleAgent",
        description: "Enable or disable an AI automation agent",
        tags: ["agents"],
        params: AgentIdParams,
        body: ToggleAgentBody,
        response: {
          200: TableAgentSchema,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId, agentId } = request.params;
      const { enabled } = request.body;

      const agent = await prisma.tableAgent.findFirst({
        where: { id: agentId, tableId },
      });

      if (!agent) {
        return reply.status(404).send({ error: "Agent not found" });
      }

      const updated = await prisma.tableAgent.update({
        where: { id: agentId },
        data: { enabled },
      });

      if (enabled) {
        agentRunner.subscribeToTable(tableId);
      } else {
        await agentRunner.unsubscribeIfEmpty(tableId);
      }

      return {
        id: updated.id,
        tableId: updated.tableId,
        name: updated.name,
        enabled: updated.enabled,
        triggerType: updated.triggerType,
        watchColumns: updated.watchColumns,
        inputColumns: updated.inputColumns,
        outputColumns: updated.outputColumns,
        prompt: updated.prompt,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );
}
