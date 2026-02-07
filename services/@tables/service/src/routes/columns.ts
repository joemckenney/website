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
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const { tableId } = request.params;
      const { name, dataType } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const state = memoryStore.getTable(tableId);
      const position = state ? state.columns.size : 0;
      const columnId = crypto.randomUUID();

      await memoryStore.applyEvent({
        type: "COLUMN_ADDED",
        tableId,
        columnId,
        name,
        dataType: dataType as ColumnType,
        position,
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
      const { name, dataType } = request.body;

      const state = memoryStore.getTable(tableId);
      if (!state) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const column = state.columns.get(columnId);
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

      // Apply type change if provided
      if (dataType !== undefined && dataType !== column.dataType) {
        await memoryStore.applyEvent({
          type: "COLUMN_TYPE_CHANGED",
          tableId,
          columnId,
          fromType: column.dataType,
          toType: dataType as ColumnType,
        });
      }

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Get updated column state
      const updatedColumn = state.columns.get(columnId)!;

      return {
        id: columnId,
        name: updatedColumn.name,
        dataType: updatedColumn.dataType,
        position: updatedColumn.position,
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

      const state = memoryStore.getTable(tableId);
      if (!state) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const column = state.columns.get(columnId);
      if (!column) {
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

      const state = memoryStore.getTable(tableId);
      if (!state) {
        return reply.status(404).send({ error: "Table not found" });
      }

      // Validate all column IDs exist
      for (const colId of columnIds) {
        if (!state.columns.has(colId)) {
          return reply.status(400).send({ error: `Column ${colId} not found` });
        }
      }

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
      return columnIds.map((id, index) => {
        const col = state.columns.get(id)!;
        return {
          id,
          name: col.name,
          dataType: col.dataType,
          position: index,
        };
      });
    },
  );
}
