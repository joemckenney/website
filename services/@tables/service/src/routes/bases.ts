import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import {
  Base,
  BaseIdParams,
  BaseListItem,
  BaseWithTables,
  CreateBaseBody,
  ErrorResponse,
  UpdateBaseBody,
} from "../schemas.js";

export async function registerBaseRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Create base
  fastify.post(
    "/bases",
    {
      schema: {
        operationId: "createBase",
        description: "Create a new base (container for tables)",
        tags: ["bases"],
        body: CreateBaseBody,
        response: {
          201: Base,
          400: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { name } = request.body;
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      const base = await prisma.base.create({
        data: {
          userId,
          name,
        },
      });

      return reply.status(201).send({
        id: base.id,
        userId: base.userId,
        name: base.name,
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
      });
    },
  );

  // List bases
  fastify.get(
    "/bases",
    {
      schema: {
        operationId: "listBases",
        description: "List all bases for the current user",
        tags: ["bases"],
        response: {
          200: Type.Array(BaseListItem),
        },
      },
    },
    async (request) => {
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      const bases = await prisma.base.findMany({
        where: { userId },
        include: {
          _count: {
            select: { tables: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      return bases.map((b) => ({
        id: b.id,
        name: b.name,
        tableCount: b._count.tables,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      }));
    },
  );

  // Get base by ID (with tables)
  fastify.get(
    "/bases/:baseId",
    {
      schema: {
        operationId: "getBase",
        description: "Get a base by ID with its tables",
        tags: ["bases"],
        params: BaseIdParams,
        response: {
          200: BaseWithTables,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { baseId } = request.params;

      const base = await prisma.base.findUnique({
        where: { id: baseId },
        include: {
          tables: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!base) {
        return reply.status(404).send({ error: "Base not found" });
      }

      return {
        id: base.id,
        userId: base.userId,
        name: base.name,
        tables: base.tables.map((t) => ({
          id: t.id,
          name: t.name,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        createdAt: base.createdAt.toISOString(),
        updatedAt: base.updatedAt.toISOString(),
      };
    },
  );

  // Update base (rename)
  fastify.patch(
    "/bases/:baseId",
    {
      schema: {
        operationId: "updateBase",
        description: "Update a base (rename)",
        tags: ["bases"],
        params: BaseIdParams,
        body: UpdateBaseBody,
        response: {
          200: Base,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { baseId } = request.params;
      const { name } = request.body;

      const existing = await prisma.base.findUnique({
        where: { id: baseId },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Base not found" });
      }

      const updated = await prisma.base.update({
        where: { id: baseId },
        data: { name, updatedAt: new Date() },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );

  // Delete base (cascades to tables)
  fastify.delete(
    "/bases/:baseId",
    {
      schema: {
        operationId: "deleteBase",
        description: "Delete a base and all its tables",
        tags: ["bases"],
        params: BaseIdParams,
        response: {
          204: Type.Null(),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { baseId } = request.params;

      const existing = await prisma.base.findUnique({
        where: { id: baseId },
      });

      if (!existing) {
        return reply.status(404).send({ error: "Base not found" });
      }

      // Delete base (tables cascade via onDelete: Cascade in schema)
      await prisma.base.delete({
        where: { id: baseId },
      });

      return reply.status(204).send(null);
    },
  );
}
