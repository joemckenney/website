import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import {
  CreateTableBody,
  ErrorResponse,
  Table,
  TableIdParams,
  TableListItem,
  UpdateTableBody,
} from "../schemas.js";
import { memoryStore } from "../store/memory.js";

export async function registerTableRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Create table
  fastify.post(
    "/tables",
    {
      schema: {
        operationId: "createTable",
        description: "Create a new table",
        tags: ["tables"],
        body: CreateTableBody,
        response: {
          201: Table,
          400: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { name, columns = [] } = request.body;

      // For now, use a placeholder userId - in production this comes from auth
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      // Generate table ID
      const tableId = crypto.randomUUID();

      // Create table metadata in PostgreSQL
      const tableMeta = await prisma.tableMeta.create({
        data: {
          id: tableId,
          userId,
          name,
        },
      });

      // Apply TABLE_CREATED event
      await memoryStore.applyEvent({
        type: "TABLE_CREATED",
        tableId,
        userId,
        name,
      });

      // Add initial columns if provided
      const columnMetas = [];
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        const columnId = crypto.randomUUID();
        await memoryStore.applyEvent({
          type: "COLUMN_ADDED",
          tableId,
          columnId,
          name: col.name,
          dataType: col.dataType,
          position: i,
        });
        columnMetas.push({
          id: columnId,
          name: col.name,
          dataType: col.dataType,
          position: i,
        });
      }

      return reply.status(201).send({
        id: tableId,
        userId,
        name,
        columns: columnMetas,
        createdAt: tableMeta.createdAt.toISOString(),
        updatedAt: tableMeta.updatedAt.toISOString(),
      });
    },
  );

  // List tables
  fastify.get(
    "/tables",
    {
      schema: {
        operationId: "listTables",
        description: "List all tables for the current user",
        tags: ["tables"],
        response: {
          200: Type.Array(TableListItem),
        },
      },
    },
    async (request) => {
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      const tables = await prisma.tableMeta.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      return tables.map((t) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));
    },
  );

  // Get table by ID
  fastify.get(
    "/tables/:tableId",
    {
      schema: {
        operationId: "getTable",
        description: "Get a table by ID with its schema",
        tags: ["tables"],
        params: TableIdParams,
        response: {
          200: Table,
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

      const state = memoryStore.getTable(tableId);
      const columns = state
        ? Array.from(state.columns.values()).sort(
            (a, b) => a.position - b.position,
          )
        : [];

      return {
        id: tableMeta.id,
        userId: tableMeta.userId,
        name: tableMeta.name,
        columns,
        createdAt: tableMeta.createdAt.toISOString(),
        updatedAt: tableMeta.updatedAt.toISOString(),
      };
    },
  );

  // Update table (rename)
  fastify.patch(
    "/tables/:tableId",
    {
      schema: {
        operationId: "updateTable",
        description: "Update a table (rename)",
        tags: ["tables"],
        params: TableIdParams,
        body: UpdateTableBody,
        response: {
          200: Table,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { name } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      // Update metadata
      const updated = await prisma.tableMeta.update({
        where: { id: tableId },
        data: { name },
      });

      // Apply event
      await memoryStore.applyEvent({
        type: "TABLE_RENAMED",
        tableId,
        name,
      });

      const state = memoryStore.getTable(tableId);
      const columns = state
        ? Array.from(state.columns.values()).sort(
            (a, b) => a.position - b.position,
          )
        : [];

      return {
        id: updated.id,
        userId: updated.userId,
        name: updated.name,
        columns,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
  );

  // Delete table
  fastify.delete(
    "/tables/:tableId",
    {
      schema: {
        operationId: "deleteTable",
        description: "Delete a table",
        tags: ["tables"],
        params: TableIdParams,
        response: {
          204: Type.Null(),
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

      // Apply event first
      await memoryStore.applyEvent({
        type: "TABLE_DELETED",
        tableId,
      });

      // Delete metadata
      await prisma.tableMeta.delete({
        where: { id: tableId },
      });

      return reply.status(204).send(null);
    },
  );
}
