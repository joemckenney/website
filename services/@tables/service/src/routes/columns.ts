import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import type { ColumnType } from "../lib/events.js";
import {
  AddColumnBody,
  Column,
  ColumnIdParams,
  ErrorResponse,
  ReorderColumnsBody,
  TableIdParams,
  UpdateColumnBody,
} from "../schemas.js";
import { memoryStore } from "../store/memory.js";

export async function registerColumnRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Add column
  fastify.post(
    "/tables/:tableId/columns",
    {
      schema: {
        operationId: "addColumn",
        description: "Add a new column to a table",
        tags: ["columns"],
        params: TableIdParams,
        body: AddColumnBody,
        response: {
          201: Column,
          400: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { name, dataType, referencedTableId } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      // Validate relation-specific fields
      if (dataType === "relation") {
        if (!referencedTableId) {
          return reply
            .status(400)
            .send({
              error: "referencedTableId is required for relation columns",
            });
        }

        const referencedTableMeta = await prisma.tableMeta.findUnique({
          where: { id: referencedTableId },
        });

        if (!referencedTableMeta) {
          return reply
            .status(400)
            .send({ error: "Referenced table not found" });
        }

        if (referencedTableMeta.baseId !== tableMeta.baseId) {
          return reply
            .status(400)
            .send({ error: "Referenced table must be in the same base" });
        }

        if (memoryStore.wouldCreateCycle(tableId, referencedTableId)) {
          return reply
            .status(400)
            .send({
              error: "Adding this relation would create a circular dependency",
            });
        }
      } else if (referencedTableId) {
        return reply
          .status(400)
          .send({
            error: "referencedTableId is only valid for relation columns",
          });
      }

      const table = memoryStore.getTable(tableId);
      const position = table ? table.columns.size : 0;
      const columnId = crypto.randomUUID();

      await memoryStore.applyEvent({
        type: "COLUMN_ADDED",
        tableId,
        columnId,
        name,
        dataType: dataType as ColumnType,
        position,
        ...(referencedTableId ? { referencedTableId } : {}),
      });

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      return reply.status(201).send({
        id: columnId,
        name,
        dataType,
        position,
        ...(referencedTableId ? { referencedTableId } : {}),
      });
    },
  );

  // Update column (rename or change type)
  fastify.patch(
    "/tables/:tableId/columns/:columnId",
    {
      schema: {
        operationId: "updateColumn",
        description: "Update a column (rename or change type)",
        tags: ["columns"],
        params: ColumnIdParams,
        body: UpdateColumnBody,
        response: {
          200: Column,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId, columnId } = request.params;
      const { name } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const table = memoryStore.getTable(tableId);
      if (!table) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const column = table.columns.get(columnId);
      if (!column) {
        return reply.status(404).send({ error: "Column not found" });
      }

      // Apply rename if provided
      if (name !== undefined) {
        await memoryStore.applyEvent({
          type: "COLUMN_RENAMED",
          tableId,
          columnId,
          name,
        });
      }

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Get updated column state
      const updatedTable = memoryStore.getTable(tableId);
      const updatedColumn = updatedTable?.columns.get(columnId);

      const refTableId =
        updatedColumn?.referencedTableId ?? column.referencedTableId;
      return {
        id: columnId,
        name: updatedColumn?.name ?? column.name,
        dataType: updatedColumn?.dataType ?? column.dataType,
        position: updatedColumn?.position ?? column.position,
        ...(refTableId ? { referencedTableId: refTableId } : {}),
      };
    },
  );

  // Delete column
  fastify.delete(
    "/tables/:tableId/columns/:columnId",
    {
      schema: {
        operationId: "deleteColumn",
        description: "Delete a column",
        tags: ["columns"],
        params: ColumnIdParams,
        response: {
          204: Type.Null(),
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId, columnId } = request.params;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const table = memoryStore.getTable(tableId);
      if (!table || !table.columns.has(columnId)) {
        return reply.status(404).send({ error: "Column not found" });
      }

      await memoryStore.applyEvent({
        type: "COLUMN_DELETED",
        tableId,
        columnId,
      });

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      return reply.status(204).send(null);
    },
  );

  // Reorder columns
  fastify.post(
    "/tables/:tableId/columns/reorder",
    {
      schema: {
        operationId: "reorderColumns",
        description: "Reorder columns in a table",
        tags: ["columns"],
        params: TableIdParams,
        body: ReorderColumnsBody,
        response: {
          200: Type.Array(Column),
          400: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { columnIds } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const table = memoryStore.getTable(tableId);
      if (!table) {
        return reply.status(404).send({ error: "Table not found" });
      }

      // Validate all column IDs exist
      for (const colId of columnIds) {
        if (!table.columns.has(colId)) {
          return reply.status(400).send({ error: `Column ${colId} not found` });
        }
      }

      // Apply reorder event
      await memoryStore.applyEvent({
        type: "COLUMN_REORDERED",
        tableId,
        columnIds,
      });

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Return updated columns in new order
      const updatedTable = memoryStore.getTable(tableId);
      return columnIds.map((id, index) => {
        const col = updatedTable?.columns.get(id);
        return {
          id,
          name: col?.name ?? "",
          dataType: col?.dataType ?? "text",
          position: index,
          ...(col?.referencedTableId
            ? { referencedTableId: col.referencedTableId }
            : {}),
        };
      });
    },
  );
}
