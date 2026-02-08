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
import { addColumn, getColumns, updateTableName } from "../yjs/schema.js";
import {
  applyTableUpdate,
  createTableDoc,
  deleteTableDoc,
  getTableDoc,
} from "../yjs/server.js";

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
      const userId = (request.headers["x-user-id"] as string) || "anonymous";

      // Generate table ID
      const tableId = crypto.randomUUID();

      // Create table with Yjs (creates Y.Doc + PostgreSQL metadata)
      await createTableDoc(tableId, userId, name);

      // Add initial columns if provided
      if (columns.length > 0) {
        await applyTableUpdate(tableId, (doc) => {
          for (const col of columns) {
            addColumn(doc, {
              id: crypto.randomUUID(),
              name: col.name,
              dataType: col.dataType,
            });
          }
        });
      }

      // Get the created table to return
      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      const doc = await getTableDoc(tableId);
      const columnMetas = getColumns(doc);

      return reply.status(201).send({
        id: tableId,
        userId,
        name,
        columns: columnMetas,
        createdAt: tableMeta?.createdAt.toISOString() ?? new Date().toISOString(),
        updatedAt: tableMeta?.updatedAt.toISOString() ?? new Date().toISOString(),
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

      const doc = await getTableDoc(tableId);
      const columns = getColumns(doc);

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

      // Update via Yjs (will also update PostgreSQL metadata)
      await applyTableUpdate(tableId, (doc) => {
        updateTableName(doc, name);
      });

      const doc = await getTableDoc(tableId);
      const columns = getColumns(doc);

      // Get updated metadata
      const updated = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      return {
        id: tableId,
        userId: tableMeta.userId,
        name,
        columns,
        createdAt: updated?.createdAt.toISOString() ?? tableMeta.createdAt.toISOString(),
        updatedAt: updated?.updatedAt.toISOString() ?? new Date().toISOString(),
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

      // Delete via Yjs (removes Y.Doc + PostgreSQL metadata)
      await deleteTableDoc(tableId);

      return reply.status(204).send(null);
    },
  );
}
