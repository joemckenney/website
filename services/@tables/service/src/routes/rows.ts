import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import {
  BulkRowsBody,
  ErrorResponse,
  InsertRowBody,
  Row,
  RowIdParams,
  RowsQueryParams,
  RowsResponse,
  TableIdParams,
  UpdateRowBody,
} from "../schemas.js";
import { memoryStore } from "../store/memory.js";

export async function registerRowRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // List rows (paginated)
  fastify.get(
    "/tables/:tableId/rows",
    {
      schema: {
        operationId: "listRows",
        description: "List rows in a table (paginated)",
        tags: ["rows"],
        params: TableIdParams,
        querystring: RowsQueryParams,
        response: {
          200: RowsResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { offset = 0, limit = 50, sortBy, sortOrder } = request.query;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const { rows, total } = memoryStore.queryRows(tableId, {
        offset,
        limit,
        sortBy,
        sortOrder,
      });

      return {
        rows,
        total,
        offset,
        limit,
      };
    },
  );

  // Insert row
  fastify.post(
    "/tables/:tableId/rows",
    {
      schema: {
        operationId: "insertRow",
        description: "Insert a new row",
        tags: ["rows"],
        params: TableIdParams,
        body: InsertRowBody,
        response: {
          201: Row,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { data = {} } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const rowId = crypto.randomUUID();

      await memoryStore.applyEvent({
        type: "ROW_INSERTED",
        tableId,
        rowId,
        data,
      });

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      const row = memoryStore.getRow(tableId, rowId);

      return reply.status(201).send(row!);
    },
  );

  // Update row (full or partial)
  fastify.patch(
    "/tables/:tableId/rows/:rowId",
    {
      schema: {
        operationId: "updateRow",
        description: "Update a row (partial update)",
        tags: ["rows"],
        params: RowIdParams,
        body: UpdateRowBody,
        response: {
          200: Row,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId, rowId } = request.params;
      const { data } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const existingRow = memoryStore.getRow(tableId, rowId);
      if (!existingRow) {
        return reply.status(404).send({ error: "Row not found" });
      }

      // Apply cell updates for each field
      for (const [columnId, value] of Object.entries(data)) {
        await memoryStore.applyEvent({
          type: "CELL_UPDATED",
          tableId,
          rowId,
          columnId,
          value,
        });
      }

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      const row = memoryStore.getRow(tableId, rowId);

      return row!;
    },
  );

  // Delete row
  fastify.delete(
    "/tables/:tableId/rows/:rowId",
    {
      schema: {
        operationId: "deleteRow",
        description: "Delete a row",
        tags: ["rows"],
        params: RowIdParams,
        response: {
          204: Type.Null(),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId, rowId } = request.params;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const existingRow = memoryStore.getRow(tableId, rowId);
      if (!existingRow) {
        return reply.status(404).send({ error: "Row not found" });
      }

      await memoryStore.applyEvent({
        type: "ROW_DELETED",
        tableId,
        rowId,
      });

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      return reply.status(204).send(null);
    },
  );

  // Bulk operations
  fastify.post(
    "/tables/:tableId/rows/bulk",
    {
      schema: {
        operationId: "bulkRowOperation",
        description: "Perform bulk operations on rows",
        tags: ["rows"],
        params: TableIdParams,
        body: BulkRowsBody,
        response: {
          200: Type.Object({
            affected: Type.Number({ description: "Number of rows affected" }),
          }),
          400: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { operation, rowIds } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      if (rowIds.length === 0) {
        return reply.status(400).send({ error: "No row IDs provided" });
      }

      switch (operation) {
        case "delete":
          await memoryStore.applyEvent({
            type: "ROWS_BULK_DELETED",
            tableId,
            rowIds,
          });
          break;
      }

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      return { affected: rowIds.length };
    },
  );
}
