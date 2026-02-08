/**
 * Tables MCP Tool implementations
 *
 * Tools for AI agent interaction with data tables using Yjs CRDTs.
 *
 * Tools:
 * - list-tables: List all user's tables
 * - get-table-schema: Get columns for a table
 * - query-rows: Query rows with pagination
 * - update-cell: Update a single cell
 * - insert-row: Insert a new row
 * - delete-rows: Delete rows by ID
 * - add-column: Add a column
 * - rename-column: Rename a column
 * - delete-column: Delete a column
 */

import { randomUUID } from "node:crypto";
import { prisma } from "../db/client.js";
import {
  addColumn as yjsAddColumn,
  deleteColumn as yjsDeleteColumn,
  deleteRow as yjsDeleteRow,
  deleteRows as yjsDeleteRows,
  getColumns,
  getRow,
  getRows,
  getTableMeta,
  insertRow as yjsInsertRow,
  renameColumn as yjsRenameColumn,
  updateCell as yjsUpdateCell,
  type ColumnType,
} from "../yjs/schema.js";
import { applyTableUpdate, getTableDoc } from "../yjs/server.js";

/**
 * Tool definition for MCP
 */
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Get tool definitions for MCP tools/list
 */
export function getToolDefinitions(): ToolDefinition[] {
  return [
    {
      name: "list-tables",
      description:
        "List all of the user's tables. Returns a list of tables with their ID, name, column count, and row count.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get-table-schema",
      description:
        "Get the schema (columns) for the current table. Returns the list of columns with their ID, name, and data type.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "query-rows",
      description:
        "Query rows from the current table with optional pagination. Returns rows with their data and the total count.",
      inputSchema: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of rows to return (default: 50)",
          },
          offset: {
            type: "number",
            description: "Number of rows to skip (default: 0)",
          },
        },
      },
    },
    {
      name: "update-cell",
      description:
        "Update a single cell in the current table. Specify the row ID, column ID, and new value.",
      inputSchema: {
        type: "object",
        properties: {
          rowId: {
            type: "string",
            description: "The ID of the row to update",
          },
          columnId: {
            type: "string",
            description: "The ID of the column to update",
          },
          value: {
            description: "The new value for the cell",
          },
        },
        required: ["rowId", "columnId", "value"],
      },
    },
    {
      name: "insert-row",
      description:
        "Insert a new row into the current table. Optionally provide initial data for the row.",
      inputSchema: {
        type: "object",
        properties: {
          data: {
            type: "object",
            description:
              "Optional initial data for the row, as an object with column IDs as keys",
          },
        },
      },
    },
    {
      name: "delete-rows",
      description:
        "Delete one or more rows from the current table by their IDs.",
      inputSchema: {
        type: "object",
        properties: {
          rowIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of row IDs to delete",
          },
        },
        required: ["rowIds"],
      },
    },
    {
      name: "add-column",
      description:
        "Add a new column to the current table. Specify the column name and data type.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the new column",
          },
          dataType: {
            type: "string",
            enum: ["text", "number", "boolean", "date", "select"],
            description:
              "Data type for the column (text, number, boolean, date, select)",
          },
        },
        required: ["name", "dataType"],
      },
    },
    {
      name: "rename-column",
      description: "Rename a column in the current table.",
      inputSchema: {
        type: "object",
        properties: {
          columnId: {
            type: "string",
            description: "The ID of the column to rename",
          },
          name: {
            type: "string",
            description: "New name for the column",
          },
        },
        required: ["columnId", "name"],
      },
    },
    {
      name: "delete-column",
      description: "Delete a column from the current table.",
      inputSchema: {
        type: "object",
        properties: {
          columnId: {
            type: "string",
            description: "The ID of the column to delete",
          },
        },
        required: ["columnId"],
      },
    },
  ];
}

/**
 * Verify user has access to a table
 */
async function verifyTableAccess(
  tableId: string,
  userId: string,
): Promise<boolean> {
  const tableMeta = await prisma.tableMeta.findFirst({
    where: {
      id: tableId,
      userId,
    },
  });
  return tableMeta !== null;
}

/**
 * Handle a tool call using Yjs
 * @param contextTableId - Optional table ID from request header, used as default
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  contextTableId?: string,
): Promise<unknown> {
  // Use contextTableId as default if tableId not explicitly provided
  const argsWithDefault = contextTableId
    ? { tableId: contextTableId, ...args }
    : args;

  switch (toolName) {
    case "list-tables":
      return listTables(userId);

    case "get-table-schema":
      return getTableSchema(argsWithDefault, userId);

    case "query-rows":
      return queryRows(argsWithDefault, userId);

    case "update-cell":
      return updateCell(argsWithDefault, userId);

    case "insert-row":
      return insertRow(argsWithDefault, userId);

    case "delete-rows":
      return deleteRows(argsWithDefault, userId);

    case "add-column":
      return addColumn(argsWithDefault, userId);

    case "rename-column":
      return renameColumn(argsWithDefault, userId);

    case "delete-column":
      return deleteColumn(argsWithDefault, userId);

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

/**
 * List all tables for a user
 */
async function listTables(userId: string): Promise<unknown> {
  const tableMetas = await prisma.tableMeta.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const results = await Promise.all(
    tableMetas.map(async (meta) => {
      try {
        const doc = await getTableDoc(meta.id);
        const columns = getColumns(doc);
        const rows = getRows(doc);

        return {
          id: meta.id,
          name: meta.name,
          columnCount: columns.length,
          rowCount: rows.length,
        };
      } catch {
        return {
          id: meta.id,
          name: meta.name,
          columnCount: 0,
          rowCount: 0,
        };
      }
    }),
  );

  return results;
}

/**
 * Get table schema (columns)
 */
async function getTableSchema(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  const doc = await getTableDoc(tableId);
  const meta = getTableMeta(doc);
  const columns = getColumns(doc);

  return {
    tableId,
    tableName: meta.name,
    columns: columns.map((col) => ({
      id: col.id,
      name: col.name,
      dataType: col.dataType,
    })),
  };
}

/**
 * Query rows from a table
 */
async function queryRows(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  const limit = Math.min(Number(args.limit) || 50, 200);
  const offset = Number(args.offset) || 0;

  const doc = await getTableDoc(tableId);
  const allRows = getRows(doc);

  const paginatedRows = allRows.slice(offset, offset + limit);

  return {
    rows: paginatedRows,
    total: allRows.length,
    limit,
    offset,
  };
}

/**
 * Update a single cell
 */
async function updateCell(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const rowId = args.rowId as string;
  const columnId = args.columnId as string;
  const value = args.value;

  if (!tableId || !rowId || !columnId) {
    throw new Error("tableId, rowId, and columnId are required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  await applyTableUpdate(tableId, (doc) => {
    yjsUpdateCell(doc, rowId, columnId, value);
  });

  return { success: true };
}

/**
 * Insert a new row
 */
async function insertRow(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const data = (args.data as Record<string, unknown>) || {};

  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  const rowId = randomUUID();

  await applyTableUpdate(tableId, (doc) => {
    yjsInsertRow(doc, rowId, data);
  });

  // Get the inserted row
  const doc = await getTableDoc(tableId);
  const row = getRow(doc, rowId);

  return { rowId, row };
}

/**
 * Delete rows by ID
 */
async function deleteRows(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const rowIds = args.rowIds as string[];

  if (!tableId || !rowIds || !Array.isArray(rowIds)) {
    throw new Error("tableId and rowIds array are required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  await applyTableUpdate(tableId, (doc) => {
    if (rowIds.length === 1) {
      yjsDeleteRow(doc, rowIds[0]);
    } else {
      yjsDeleteRows(doc, rowIds);
    }
  });

  return { deleted: rowIds.length };
}

/**
 * Add a new column
 */
async function addColumn(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const name = args.name as string;
  const dataType = args.dataType as ColumnType;

  if (!tableId || !name || !dataType) {
    throw new Error("tableId, name, and dataType are required");
  }

  const validTypes: ColumnType[] = [
    "text",
    "number",
    "boolean",
    "date",
    "select",
  ];
  if (!validTypes.includes(dataType)) {
    throw new Error(
      `Invalid dataType. Must be one of: ${validTypes.join(", ")}`,
    );
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  const columnId = randomUUID();

  await applyTableUpdate(tableId, (doc) => {
    yjsAddColumn(doc, {
      id: columnId,
      name,
      dataType,
    });
  });

  // Get the column position
  const doc = await getTableDoc(tableId);
  const columns = getColumns(doc);
  const column = columns.find((c) => c.id === columnId);

  return {
    columnId,
    column: column ?? { id: columnId, name, dataType, position: columns.length - 1 },
  };
}

/**
 * Rename a column
 */
async function renameColumn(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const columnId = args.columnId as string;
  const name = args.name as string;

  if (!tableId || !columnId || !name) {
    throw new Error("tableId, columnId, and name are required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  await applyTableUpdate(tableId, (doc) => {
    yjsRenameColumn(doc, columnId, name);
  });

  return { success: true };
}

/**
 * Delete a column
 */
async function deleteColumn(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const columnId = args.columnId as string;

  if (!tableId || !columnId) {
    throw new Error("tableId and columnId are required");
  }

  if (!(await verifyTableAccess(tableId, userId))) {
    throw new Error("Table not found or access denied");
  }

  await applyTableUpdate(tableId, (doc) => {
    yjsDeleteColumn(doc, columnId);
  });

  return { success: true };
}
