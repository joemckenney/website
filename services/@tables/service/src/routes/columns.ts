import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { prisma } from "../db/client.js";
import {
  AddColumnBody,
  Column,
  ColumnIdParams,
  ErrorResponse,
  ReorderColumnsBody,
  TableIdParams,
  UpdateColumnBody,
} from "../schemas.js";
import {
  addColumn,
  deleteColumn,
  getColumns,
  renameColumn,
  type ColumnType,
} from "../yjs/schema.js";
import { applyTableUpdate, getTableDoc } from "../yjs/server.js";

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

      const doc = await getTableDoc(tableId);
      const existingColumns = getColumns(doc);
      const position = existingColumns.length;
      const columnId = crypto.randomUUID();

      await applyTableUpdate(tableId, (doc) => {
        addColumn(doc, {
          id: columnId,
          name,
          dataType: dataType as ColumnType,
        });
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
      const { name } = request.body;

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const doc = await getTableDoc(tableId);
      const columns = getColumns(doc);
      const column = columns.find((c) => c.id === columnId);

      if (!column) {
        return reply.status(404).send({ error: "Column not found" });
      }

      // Apply rename if provided
      if (name !== undefined) {
        await applyTableUpdate(tableId, (doc) => {
          renameColumn(doc, columnId, name);
        });
      }

      // Get updated column state
      const updatedDoc = await getTableDoc(tableId);
      const updatedColumns = getColumns(updatedDoc);
      const updatedColumn = updatedColumns.find((c) => c.id === columnId)!;

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

      const tableMeta = await prisma.tableMeta.findUnique({
        where: { id: tableId },
      });

      if (!tableMeta) {
        return reply.status(404).send({ error: "Table not found" });
      }

      const doc = await getTableDoc(tableId);
      const columns = getColumns(doc);
      const column = columns.find((c) => c.id === columnId);

      if (!column) {
        return reply.status(404).send({ error: "Column not found" });
      }

      await applyTableUpdate(tableId, (doc) => {
        deleteColumn(doc, columnId);
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

      const doc = await getTableDoc(tableId);
      const columns = getColumns(doc);

      // Validate all column IDs exist
      for (const colId of columnIds) {
        if (!columns.find((c) => c.id === colId)) {
          return reply.status(400).send({ error: `Column ${colId} not found` });
        }
      }

      // Update positions in Yjs
      await applyTableUpdate(tableId, (doc) => {
        const columnsMap = doc.getMap("columns");
        columnIds.forEach((colId, index) => {
          const col = columnsMap.get(colId) as Record<string, unknown>;
          if (col) {
            columnsMap.set(colId, { ...col, position: index });
          }
        });
      });

      // Return updated columns in new order
      const updatedDoc = await getTableDoc(tableId);
      const updatedColumns = getColumns(updatedDoc);

      return columnIds.map((id, index) => {
        const col = updatedColumns.find((c) => c.id === id)!;
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
