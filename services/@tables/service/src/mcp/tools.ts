/**
 * Tables MCP Tool implementations
 *
 * Tools for AI agent interaction with data tables:
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
import type { ColumnType } from "../lib/events.js";
import { broadcastTableEvent } from "../routes/websocket.js";
import { memoryStore } from "../store/memory.js";

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
function verifyTableAccess(tableId: string, userId: string): boolean {
  const table = memoryStore.getTable(tableId);
  if (!table) {
    return false;
  }
  return table.userId === userId;
}

/**
 * Handle a tool call
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
function listTables(userId: string): unknown {
  const tables = memoryStore.getTablesForUser(userId);

  return tables.map((t) => {
    const tableState = memoryStore.getTable(t.id);
    const { total } = tableState
      ? memoryStore.queryRows(t.id, { limit: 0 })
      : { total: 0 };
    return {
      id: t.id,
      name: t.name,
      columnCount: tableState?.columns.size ?? 0,
      rowCount: total,
    };
  });
}

/**
 * Get table schema (columns)
 */
function getTableSchema(
  args: Record<string, unknown>,
  userId: string,
): unknown {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const columns = Array.from(table.columns.values())
    .sort((a, b) => a.position - b.position)
    .map((col) => ({
      id: col.id,
      name: col.name,
      dataType: col.dataType,
    }));

  return {
    tableId,
    tableName: table.name,
    columns,
  };
}

/**
 * Query rows from a table
 */
function queryRows(args: Record<string, unknown>, userId: string): unknown {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const limit = Math.min(Number(args.limit) || 50, 200);
  const offset = Number(args.offset) || 0;

  const { rows, total } = memoryStore.queryRows(tableId, { limit, offset });

  return { rows, total, limit, offset };
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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const event = {
    type: "CELL_UPDATED" as const,
    tableId,
    rowId,
    columnId,
    value,
  };
  await memoryStore.applyEvent(event);
  broadcastTableEvent(event);

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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const rowId = randomUUID();

  const event = {
    type: "ROW_INSERTED" as const,
    tableId,
    rowId,
    data,
  };
  await memoryStore.applyEvent(event);
  broadcastTableEvent(event);

  const row = memoryStore.getRow(tableId, rowId);
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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  if (rowIds.length === 1) {
    const event = {
      type: "ROW_DELETED" as const,
      tableId,
      rowId: rowIds[0],
    };
    await memoryStore.applyEvent(event);
    broadcastTableEvent(event);
  } else if (rowIds.length > 1) {
    const event = {
      type: "ROWS_BULK_DELETED" as const,
      tableId,
      rowIds,
    };
    await memoryStore.applyEvent(event);
    broadcastTableEvent(event);
  }

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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const columnId = randomUUID();
  const position = table.columns.size;

  const event = {
    type: "COLUMN_ADDED" as const,
    tableId,
    columnId,
    name,
    dataType,
    position,
  };
  await memoryStore.applyEvent(event);
  broadcastTableEvent(event);

  return {
    columnId,
    column: { id: columnId, name, dataType, position },
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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const event = {
    type: "COLUMN_RENAMED" as const,
    tableId,
    columnId,
    name,
  };
  await memoryStore.applyEvent(event);
  broadcastTableEvent(event);

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

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const event = {
    type: "COLUMN_DELETED" as const,
    tableId,
    columnId,
  };
  await memoryStore.applyEvent(event);
  broadcastTableEvent(event);

  return { success: true };
}
