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
import {
  deleteRow,
  deleteRows,
  getRow,
  getRows,
  insertRow,
  updateCell,
} from "../yjs/schema.js";
import { applyTableUpdate, getTableDoc } from "../yjs/server.js";

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

      const doc = await getTableDoc(tableId);
      let rows = getRows(doc);

      // Sort if requested
      if (sortBy) {
        rows = rows.sort((a, b) => {
          const aVal = a.data[sortBy];
          const bVal = b.data[sortBy];
          if (aVal === bVal) return 0;
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          const cmp = aVal < bVal ? -1 : 1;
          return sortOrder === "desc" ? -cmp : cmp;
        });
      }

      const total = rows.length;
      const pagedRows = rows.slice(offset, offset + limit);

      return {
        rows: pagedRows,
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

      await applyTableUpdate(tableId, (doc) => {
        insertRow(doc, rowId, data);
      });

      const doc = await getTableDoc(tableId);
      const row = getRow(doc, rowId);

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

      const doc = await getTableDoc(tableId);
      const existingRow = getRow(doc, rowId);

      if (!existingRow) {
        return reply.status(404).send({ error: "Row not found" });
      }

      await applyTableUpdate(tableId, (doc) => {
        for (const [columnId, value] of Object.entries(data)) {
          updateCell(doc, rowId, columnId, value);
        }
      });

      const updatedDoc = await getTableDoc(tableId);
      const row = getRow(updatedDoc, rowId);

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

      const doc = await getTableDoc(tableId);
      const existingRow = getRow(doc, rowId);

      if (!existingRow) {
        return reply.status(404).send({ error: "Row not found" });
      }

      await applyTableUpdate(tableId, (doc) => {
        deleteRow(doc, rowId);
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
          await applyTableUpdate(tableId, (doc) => {
            deleteRows(doc, rowIds);
          });
          break;
      }

      return { affected: rowIds.length };
    },
  );
}
