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
  TablesQueryParams,
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
      const { baseId, name, columns = [] } = request.body;
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      // Verify base exists and belongs to user
      const base = await prisma.base.findUnique({
        where: { id: baseId },
      });

      if (!base) {
        return reply.status(400).send({ error: "Base not found" });
      }

      if (base.userId !== userId) {
        return reply
          .status(400)
          .send({ error: "Base does not belong to user" });
      }

      // Generate table ID
      const tableId = crypto.randomUUID();

      // Create table metadata in PostgreSQL
      await prisma.tableMeta.create({
        data: {
          id: tableId,
          baseId,
          userId,
          name,
        },
      });

      // Create table in memory store via event
      await memoryStore.applyEvent({
        type: "TABLE_CREATED",
        tableId,
        userId,
        name,
      });

      // Set baseId on the in-memory table state
      memoryStore.setTableBaseId(tableId, baseId);

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

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      return reply.status(201).send({
        id: tableId,
        userId,
        name,
        columns: columnMetas,
        createdAt:
          tableMeta?.createdAt.toISOString() ?? new Date().toISOString(),
        updatedAt:
          tableMeta?.updatedAt.toISOString() ?? new Date().toISOString(),
      });
    },
  );

  // List tables
  fastify.get(
    "/tables",
    {
      schema: {
        operationId: "listTables",
        description:
          "List all tables for the current user, optionally filtered by base",
        tags: ["tables"],
        querystring: TablesQueryParams,
        response: {
          200: Type.Array(TableListItem),
        },
      },
    },
    async (request) => {
      const userId = (request.headers["x-user-id"] as string) || "anonymous";
      const { baseId } = request.query;

      const tables = await prisma.tableMeta.findMany({
        where: {
          userId,
          ...(baseId ? { baseId } : {}),
        },
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

      const table = memoryStore.getTable(tableId);
      const columns = table
        ? Array.from(table.columns.values())
            .sort((a, b) => a.position - b.position)
            .map((col) => ({
              id: col.id,
              name: col.name,
              dataType: col.dataType,
              position: col.position,
              ...(col.referencedTableId
                ? { referencedTableId: col.referencedTableId }
                : {}),
            }))
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

      // Apply rename event
      await memoryStore.applyEvent({
        type: "TABLE_RENAMED",
        tableId,
        name,
      });

      // Update metadata
      const updated = await prisma.tableMeta.update({
        where: { id: tableId },
        data: { name, updatedAt: new Date() },
      });

      const table = memoryStore.getTable(tableId);
      const columns = table
        ? Array.from(table.columns.values())
            .sort((a, b) => a.position - b.position)
            .map((col) => ({
              id: col.id,
              name: col.name,
              dataType: col.dataType,
              position: col.position,
              ...(col.referencedTableId
                ? { referencedTableId: col.referencedTableId }
                : {}),
            }))
        : [];

      return {
        id: tableId,
        userId: tableMeta.userId,
        name,
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

      // Apply delete event
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
