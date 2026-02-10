/**
 * Tables MCP Tool implementations
 *
 * 26 tools for AI agent interaction with data tables:
 *
 * Table & base management:
 *   create-base, rename-base, delete-base
 *   list-tables, create-table, rename-table, delete-table
 *
 * Schema:
 *   get-table-schema, add-column, rename-column, delete-column,
 *   reorder-columns, change-column-type
 *
 * Data operations:
 *   query-rows, search-rows, aggregate
 *   insert-row, bulk-insert, update-cell, bulk-update, delete-rows
 *
 * Agent automations:
 *   create-agent, list-agents, update-agent, delete-agent, toggle-agent
 */

import { randomUUID } from "node:crypto";
import { agentGraph } from "../agents/graph.js";
import { agentRunner } from "../agents/runner.js";
import { prisma } from "../db/client.js";
import type { ColumnType } from "../lib/events.js";
import { type FilterCondition, memoryStore } from "../store/memory.js";

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
        "Get the schema (columns) for a table. Returns the list of columns with their ID, name, and data type. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description:
              "Table ID to get schema for (defaults to active table)",
          },
        },
      },
    },
    {
      name: "query-rows",
      description:
        "Query rows from a table with optional pagination and sorting. Returns rows with their data and the total count. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID to query (defaults to active table)",
          },
          limit: {
            type: "number",
            description: "Maximum number of rows to return (default: 50)",
          },
          offset: {
            type: "number",
            description: "Number of rows to skip (default: 0)",
          },
          sortBy: {
            type: "string",
            description: "Column ID to sort by (or _created_at / _updated_at)",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction (default: asc)",
          },
        },
      },
    },
    {
      name: "update-cell",
      description:
        "Update a single cell in a table. Specify the row ID, column ID, and new value. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
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
        "Insert a new row into a table. Optionally provide initial data for the row. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
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
        "Delete one or more rows from a table by their IDs. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
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
        "Add a new column to a table. Specify the column name and data type. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
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
      description: "Rename a column in a table. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
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
      description:
        "Delete a column from a table. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          columnId: {
            type: "string",
            description: "The ID of the column to delete",
          },
        },
        required: ["columnId"],
      },
    },
    {
      name: "create-agent",
      description:
        'Create an AI automation agent for a table. The agent watches for row inserts or cell updates and automatically fills in output columns using AI. triggerType must be "on_row_insert" or "on_cell_update". For "on_cell_update", watchColumns specifies which columns trigger the agent. Defaults to the active table.',
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          name: {
            type: "string",
            description: "Human-readable name for the agent",
          },
          triggerType: {
            type: "string",
            enum: ["on_row_insert", "on_cell_update"],
            description: "When the agent should fire",
          },
          watchColumns: {
            type: "array",
            items: { type: "string" },
            description:
              'Column IDs that trigger the agent (required for "on_cell_update")',
          },
          inputColumns: {
            type: "array",
            items: { type: "string" },
            description: "Column IDs the agent reads from",
          },
          outputColumns: {
            type: "array",
            items: { type: "string" },
            description: "Column IDs the agent writes to",
          },
          prompt: {
            type: "string",
            description:
              "Instructions for the agent describing what data to generate",
          },
        },
        required: [
          "name",
          "triggerType",
          "inputColumns",
          "outputColumns",
          "prompt",
        ],
      },
    },
    {
      name: "list-agents",
      description:
        "List all AI automation agents for a table, including their trigger type, columns, and enabled status. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
        },
      },
    },
    {
      name: "update-agent",
      description:
        "Update an existing AI automation agent's configuration. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          agentId: {
            type: "string",
            description: "The ID of the agent to update",
          },
          name: { type: "string", description: "New name" },
          triggerType: {
            type: "string",
            enum: ["on_row_insert", "on_cell_update"],
          },
          watchColumns: {
            type: "array",
            items: { type: "string" },
          },
          inputColumns: {
            type: "array",
            items: { type: "string" },
          },
          outputColumns: {
            type: "array",
            items: { type: "string" },
          },
          prompt: { type: "string" },
        },
        required: ["agentId"],
      },
    },
    {
      name: "delete-agent",
      description:
        "Delete an AI automation agent from a table. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          agentId: {
            type: "string",
            description: "The ID of the agent to delete",
          },
        },
        required: ["agentId"],
      },
    },
    {
      name: "toggle-agent",
      description:
        "Enable or disable an AI automation agent. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          agentId: {
            type: "string",
            description: "The ID of the agent to toggle",
          },
          enabled: {
            type: "boolean",
            description: "Whether the agent should be enabled",
          },
        },
        required: ["agentId", "enabled"],
      },
    },

    // === Base management tools ===
    {
      name: "create-base",
      description:
        "Create a new base (container for tables). Returns the new base ID and name.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the new base",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "rename-base",
      description:
        "Rename a base. If baseId is not provided, uses the current table's base.",
      inputSchema: {
        type: "object",
        properties: {
          baseId: {
            type: "string",
            description:
              "The ID of the base to rename (defaults to current table's base)",
          },
          name: {
            type: "string",
            description: "New name for the base",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "delete-base",
      description:
        "Delete a base and all its tables. If baseId is not provided, uses the current table's base.",
      inputSchema: {
        type: "object",
        properties: {
          baseId: {
            type: "string",
            description:
              "The ID of the base to delete (defaults to current table's base)",
          },
        },
      },
    },

    // === Table management tools ===
    {
      name: "create-table",
      description:
        "Create a new table in a base. If baseId is not provided, uses the current table's base. Optionally provide initial columns.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name for the new table",
          },
          baseId: {
            type: "string",
            description:
              "The base to create the table in (defaults to current table's base)",
          },
          columns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                dataType: {
                  type: "string",
                  enum: ["text", "number", "boolean", "date", "select"],
                },
              },
              required: ["name", "dataType"],
            },
            description: "Optional initial columns for the table",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "rename-table",
      description:
        "Rename a table. If tableId is not provided, uses the current table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description:
              "The ID of the table to rename (defaults to current table)",
          },
          name: {
            type: "string",
            description: "New name for the table",
          },
        },
        required: ["name"],
      },
    },
    {
      name: "delete-table",
      description:
        "Delete a table. If tableId is not provided, uses the current table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description:
              "The ID of the table to delete (defaults to current table)",
          },
        },
      },
    },

    // === Query / analytics tools ===
    {
      name: "search-rows",
      description:
        "Search rows in a table using filters. Supports comparison operators (eq, neq, gt, gte, lt, lte), text matching (contains, not_contains), and null checks (is_empty, is_not_empty). Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                columnId: {
                  type: "string",
                  description: "The column ID to filter on",
                },
                operator: {
                  type: "string",
                  enum: [
                    "eq",
                    "neq",
                    "gt",
                    "gte",
                    "lt",
                    "lte",
                    "contains",
                    "not_contains",
                    "is_empty",
                    "is_not_empty",
                  ],
                  description: "The comparison operator",
                },
                value: {
                  description:
                    "The value to compare against (not needed for is_empty/is_not_empty)",
                },
              },
              required: ["columnId", "operator"],
            },
            description: "Array of filter conditions (combined with AND)",
          },
          limit: {
            type: "number",
            description: "Maximum number of rows to return (default: 50)",
          },
          offset: {
            type: "number",
            description: "Number of rows to skip (default: 0)",
          },
          sortBy: {
            type: "string",
            description: "Column ID to sort by",
          },
          sortOrder: {
            type: "string",
            enum: ["asc", "desc"],
            description: "Sort direction (default: asc)",
          },
        },
        required: ["filters"],
      },
    },
    {
      name: "aggregate",
      description:
        "Run an aggregation function on a table. Supports count, sum, avg, min, max. Sum and avg only work on number columns. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          function: {
            type: "string",
            enum: ["count", "sum", "avg", "min", "max"],
            description: "The aggregation function to run",
          },
          columnId: {
            type: "string",
            description:
              "The column to aggregate (required for sum/avg/min/max, optional for count)",
          },
          filters: {
            type: "array",
            items: {
              type: "object",
              properties: {
                columnId: { type: "string" },
                operator: {
                  type: "string",
                  enum: [
                    "eq",
                    "neq",
                    "gt",
                    "gte",
                    "lt",
                    "lte",
                    "contains",
                    "not_contains",
                    "is_empty",
                    "is_not_empty",
                  ],
                },
                value: {},
              },
              required: ["columnId", "operator"],
            },
            description: "Optional filters to apply before aggregating",
          },
        },
        required: ["function"],
      },
    },

    // === Bulk operations ===
    {
      name: "bulk-insert",
      description:
        "Insert multiple rows at once into a table. Returns the IDs of the created rows. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                data: {
                  type: "object",
                  description: "Row data as object with column IDs as keys",
                },
              },
            },
            description: "Array of rows to insert",
          },
        },
        required: ["rows"],
      },
    },
    {
      name: "bulk-update",
      description:
        "Update multiple cells at once in a table. Each update specifies a rowId, columnId, and value. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          updates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                rowId: {
                  type: "string",
                  description: "The row to update",
                },
                columnId: {
                  type: "string",
                  description: "The column to update",
                },
                value: {
                  description: "The new value",
                },
              },
              required: ["rowId", "columnId", "value"],
            },
            description: "Array of cell updates",
          },
        },
        required: ["updates"],
      },
    },

    // === Column operations ===
    {
      name: "reorder-columns",
      description:
        "Reorder columns in a table. Provide the column IDs in the desired order. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          columnIds: {
            type: "array",
            items: { type: "string" },
            description: "Column IDs in the desired order",
          },
        },
        required: ["columnIds"],
      },
    },
    {
      name: "change-column-type",
      description:
        "Change the data type of a column in a table. Defaults to the active table.",
      inputSchema: {
        type: "object",
        properties: {
          tableId: {
            type: "string",
            description: "Table ID (defaults to active table)",
          },
          columnId: {
            type: "string",
            description: "The ID of the column to change",
          },
          newType: {
            type: "string",
            enum: ["text", "number", "boolean", "date", "select"],
            description: "The new data type for the column",
          },
        },
        required: ["columnId", "newType"],
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
 * @param contextBaseId - Optional base ID from request header, used as default
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  contextTableId?: string,
  contextBaseId?: string,
): Promise<unknown> {
  // Use context IDs as defaults if not explicitly provided
  const argsWithDefault = {
    ...(contextBaseId ? { baseId: contextBaseId } : {}),
    ...(contextTableId ? { tableId: contextTableId } : {}),
    ...args,
  };

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

    case "create-agent":
      return createAgent(argsWithDefault, userId);

    case "list-agents":
      return listAgents(argsWithDefault, userId);

    case "update-agent":
      return updateAgent(argsWithDefault, userId);

    case "delete-agent":
      return deleteAgent(argsWithDefault, userId);

    case "toggle-agent":
      return toggleAgent(argsWithDefault, userId);

    case "create-base":
      return createBase(args, userId);

    case "rename-base":
      return renameBase(argsWithDefault, userId);

    case "delete-base":
      return deleteBase(argsWithDefault, userId);

    case "create-table":
      return createTable(argsWithDefault, userId);

    case "rename-table":
      return renameTable(argsWithDefault, userId);

    case "delete-table":
      return deleteTable(argsWithDefault, userId);

    case "search-rows":
      return searchRows(argsWithDefault, userId);

    case "aggregate":
      return aggregateRows(argsWithDefault, userId);

    case "bulk-insert":
      return bulkInsert(argsWithDefault, userId);

    case "bulk-update":
      return bulkUpdate(argsWithDefault, userId);

    case "reorder-columns":
      return reorderColumns(argsWithDefault, userId);

    case "change-column-type":
      return changeColumnType(argsWithDefault, userId);

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
  const sortBy = args.sortBy as string | undefined;
  const sortOrder = (args.sortOrder as "asc" | "desc") || undefined;

  const { rows, total } = memoryStore.queryRows(tableId, {
    limit,
    offset,
    sortBy,
    sortOrder,
  });

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
  } else if (rowIds.length > 1) {
    const event = {
      type: "ROWS_BULK_DELETED" as const,
      tableId,
      rowIds,
    };
    await memoryStore.applyEvent(event);
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
    "relation",
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

  return { success: true };
}

/**
 * Create an AI automation agent
 */
async function createAgent(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const name = args.name as string;
  const triggerType = args.triggerType as string;
  const watchColumns = (args.watchColumns as string[]) || [];
  const inputColumns = args.inputColumns as string[];
  const outputColumns = args.outputColumns as string[];
  const prompt = args.prompt as string;

  if (
    !tableId ||
    !name ||
    !triggerType ||
    !inputColumns ||
    !outputColumns ||
    !prompt
  ) {
    throw new Error(
      "tableId, name, triggerType, inputColumns, outputColumns, and prompt are required",
    );
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  // Validate columns exist
  const allCols = [...inputColumns, ...outputColumns, ...watchColumns];
  for (const colId of allCols) {
    if (!table.columns.has(colId)) {
      throw new Error(`Column ${colId} not found in table`);
    }
  }

  if (triggerType === "on_cell_update" && watchColumns.length === 0) {
    throw new Error(
      'watchColumns is required for "on_cell_update" trigger type',
    );
  }

  // Validate no cycle
  const cycleError = await agentGraph.validateNoCycle(
    tableId,
    null,
    inputColumns,
    outputColumns,
  );
  if (cycleError) {
    throw new Error(cycleError);
  }

  const agent = await prisma.tableAgent.create({
    data: {
      tableId,
      name,
      triggerType,
      watchColumns,
      inputColumns,
      outputColumns,
      prompt,
    },
  });

  // Subscribe runner to this table
  agentRunner.subscribeToTable(tableId);

  // Resolve column names for readability
  const resolvedInput = inputColumns.map((id) => ({
    id,
    name: table.columns.get(id)?.name ?? id,
  }));
  const resolvedOutput = outputColumns.map((id) => ({
    id,
    name: table.columns.get(id)?.name ?? id,
  }));

  return {
    agentId: agent.id,
    name: agent.name,
    triggerType: agent.triggerType,
    inputColumns: resolvedInput,
    outputColumns: resolvedOutput,
    enabled: agent.enabled,
  };
}

/**
 * List agents for a table
 */
async function listAgents(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  const agents = await prisma.tableAgent.findMany({
    where: { tableId },
    orderBy: { createdAt: "asc" },
  });

  return agents.map((a) => ({
    id: a.id,
    name: a.name,
    triggerType: a.triggerType,
    watchColumns: a.watchColumns.map((id) => ({
      id,
      name: table?.columns.get(id)?.name ?? id,
    })),
    inputColumns: a.inputColumns.map((id) => ({
      id,
      name: table?.columns.get(id)?.name ?? id,
    })),
    outputColumns: a.outputColumns.map((id) => ({
      id,
      name: table?.columns.get(id)?.name ?? id,
    })),
    prompt: a.prompt,
    enabled: a.enabled,
  }));
}

/**
 * Update an agent
 */
async function updateAgent(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const agentId = args.agentId as string;

  if (!tableId || !agentId) {
    throw new Error("tableId and agentId are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const existing = await prisma.tableAgent.findFirst({
    where: { id: agentId, tableId },
  });
  if (!existing) {
    throw new Error("Agent not found");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const inputColumns = (args.inputColumns as string[]) ?? existing.inputColumns;
  const outputColumns =
    (args.outputColumns as string[]) ?? existing.outputColumns;
  const watchColumns = (args.watchColumns as string[]) ?? existing.watchColumns;

  // Validate columns exist
  const allCols = [...inputColumns, ...outputColumns, ...watchColumns];
  for (const colId of allCols) {
    if (!table.columns.has(colId)) {
      throw new Error(`Column ${colId} not found in table`);
    }
  }

  // Validate no cycle
  const cycleError = await agentGraph.validateNoCycle(
    tableId,
    agentId,
    inputColumns,
    outputColumns,
  );
  if (cycleError) {
    throw new Error(cycleError);
  }

  const updated = await prisma.tableAgent.update({
    where: { id: agentId },
    data: {
      ...(args.name ? { name: args.name as string } : {}),
      ...(args.triggerType ? { triggerType: args.triggerType as string } : {}),
      ...(args.watchColumns ? { watchColumns } : {}),
      ...(args.inputColumns ? { inputColumns } : {}),
      ...(args.outputColumns ? { outputColumns } : {}),
      ...(args.prompt ? { prompt: args.prompt as string } : {}),
    },
  });

  return {
    agentId: updated.id,
    name: updated.name,
    triggerType: updated.triggerType,
    enabled: updated.enabled,
    success: true,
  };
}

/**
 * Delete an agent
 */
async function deleteAgent(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const agentId = args.agentId as string;

  if (!tableId || !agentId) {
    throw new Error("tableId and agentId are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const existing = await prisma.tableAgent.findFirst({
    where: { id: agentId, tableId },
  });
  if (!existing) {
    throw new Error("Agent not found");
  }

  await prisma.tableAgent.delete({ where: { id: agentId } });

  // Unsubscribe if no more agents on this table
  await agentRunner.unsubscribeIfEmpty(tableId);

  return { deleted: true };
}

/**
 * Toggle an agent's enabled state
 */
async function toggleAgent(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const agentId = args.agentId as string;
  const enabled = args.enabled as boolean;

  if (!tableId || !agentId || typeof enabled !== "boolean") {
    throw new Error("tableId, agentId, and enabled (boolean) are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const existing = await prisma.tableAgent.findFirst({
    where: { id: agentId, tableId },
  });
  if (!existing) {
    throw new Error("Agent not found");
  }

  const updated = await prisma.tableAgent.update({
    where: { id: agentId },
    data: { enabled },
  });

  if (enabled) {
    agentRunner.subscribeToTable(tableId);
  } else {
    await agentRunner.unsubscribeIfEmpty(tableId);
  }

  return {
    agentId: updated.id,
    name: updated.name,
    enabled: updated.enabled,
  };
}

// ============================================================
// Base management tools
// ============================================================

/**
 * Get baseId from context table, with explicit override
 */
function getBaseIdFromContext(
  args: Record<string, unknown>,
): string | undefined {
  if (args.baseId) return args.baseId as string;

  const tableId = args.tableId as string | undefined;
  if (tableId) {
    return memoryStore.getTable(tableId)?.baseId;
  }
  return undefined;
}

/**
 * Create a new base
 */
async function createBase(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const name = args.name as string;
  if (!name) {
    throw new Error("name is required");
  }

  const base = await prisma.base.create({
    data: { userId, name },
  });

  return { baseId: base.id, name: base.name };
}

/**
 * Rename a base
 */
async function renameBase(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const name = args.name as string;
  if (!name) {
    throw new Error("name is required");
  }

  const baseId = getBaseIdFromContext(args);
  if (!baseId) {
    throw new Error(
      "baseId is required (or must have a current table context)",
    );
  }

  const existing = await prisma.base.findUnique({ where: { id: baseId } });
  if (!existing || existing.userId !== userId) {
    throw new Error("Base not found or access denied");
  }

  const updated = await prisma.base.update({
    where: { id: baseId },
    data: { name, updatedAt: new Date() },
  });

  return { baseId: updated.id, name: updated.name };
}

/**
 * Delete a base and all its tables
 */
async function deleteBase(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const baseId = getBaseIdFromContext(args);
  if (!baseId) {
    throw new Error(
      "baseId is required (or must have a current table context)",
    );
  }

  const existing = await prisma.base.findUnique({
    where: { id: baseId },
    include: { tables: { select: { id: true } } },
  });
  if (!existing || existing.userId !== userId) {
    throw new Error("Base not found or access denied");
  }

  // Clean up memory store for each table in the base
  for (const table of existing.tables) {
    if (memoryStore.hasTable(table.id)) {
      await memoryStore.applyEvent({
        type: "TABLE_DELETED",
        tableId: table.id,
      });
    }
  }

  await prisma.base.delete({ where: { id: baseId } });

  return { deleted: true, tablesRemoved: existing.tables.length };
}

// ============================================================
// Table management tools
// ============================================================

/**
 * Create a new table
 */
async function createTable(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const name = args.name as string;
  if (!name) {
    throw new Error("name is required");
  }

  const baseId = getBaseIdFromContext(args);
  if (!baseId) {
    throw new Error(
      "baseId is required (or must have a current table context)",
    );
  }

  // Verify base exists and belongs to user
  const base = await prisma.base.findUnique({ where: { id: baseId } });
  if (!base || base.userId !== userId) {
    throw new Error("Base not found or access denied");
  }

  const tableId = randomUUID();

  // Create table metadata in PostgreSQL
  await prisma.tableMeta.create({
    data: { id: tableId, baseId, userId, name },
  });

  // Create table in memory store via event
  await memoryStore.applyEvent({
    type: "TABLE_CREATED",
    tableId,
    userId,
    name,
  });
  memoryStore.setTableBaseId(tableId, baseId);

  // Add initial columns if provided
  const columns =
    (args.columns as Array<{ name: string; dataType: string }>) || [];
  const columnMetas = [];
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const columnId = randomUUID();
    await memoryStore.applyEvent({
      type: "COLUMN_ADDED",
      tableId,
      columnId,
      name: col.name,
      dataType: col.dataType as ColumnType,
      position: i,
    });
    columnMetas.push({
      id: columnId,
      name: col.name,
      dataType: col.dataType,
      position: i,
    });
  }

  return { tableId, name, baseId, columns: columnMetas };
}

/**
 * Rename a table
 */
async function renameTable(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const name = args.name as string;

  if (!tableId || !name) {
    throw new Error("tableId and name are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  await memoryStore.applyEvent({
    type: "TABLE_RENAMED",
    tableId,
    name,
  });

  await prisma.tableMeta.update({
    where: { id: tableId },
    data: { name, updatedAt: new Date() },
  });

  return { tableId, name };
}

/**
 * Delete a table
 */
async function deleteTable(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;

  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  await memoryStore.applyEvent({
    type: "TABLE_DELETED",
    tableId,
  });

  await prisma.tableMeta.delete({ where: { id: tableId } });

  return { deleted: true };
}

// ============================================================
// Query / analytics tools
// ============================================================

/**
 * Search rows with filters
 */
function searchRows(args: Record<string, unknown>, userId: string): unknown {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const filters = (args.filters as FilterCondition[]) || [];
  const limit = Math.min(Number(args.limit) || 50, 200);
  const offset = Number(args.offset) || 0;
  const sortBy = args.sortBy as string | undefined;
  const sortOrder = (args.sortOrder as "asc" | "desc") || undefined;

  const { rows, total } = memoryStore.queryRows(tableId, {
    limit,
    offset,
    sortBy,
    sortOrder,
    filters,
  });

  return { rows, total, limit, offset };
}

/**
 * Aggregate data from a table
 */
function aggregateRows(args: Record<string, unknown>, userId: string): unknown {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const fn = args.function as "count" | "sum" | "avg" | "min" | "max";
  if (!fn) {
    throw new Error("function is required");
  }

  const columnId = args.columnId as string | undefined;
  const filters = (args.filters as FilterCondition[]) || [];

  const { result } = memoryStore.aggregate(tableId, {
    columnId,
    function: fn,
    filters,
  });

  return { function: fn, columnId: columnId ?? null, result };
}

// ============================================================
// Bulk operations
// ============================================================

/**
 * Insert multiple rows at once
 */
async function bulkInsert(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const rows = args.rows as Array<{ data?: Record<string, unknown> }>;
  if (!rows || !Array.isArray(rows)) {
    throw new Error("rows array is required");
  }

  const rowIds: string[] = [];

  for (const row of rows) {
    const rowId = randomUUID();
    await memoryStore.applyEvent({
      type: "ROW_INSERTED",
      tableId,
      rowId,
      data: row.data || {},
    });
    rowIds.push(rowId);
  }

  return { inserted: rowIds.length, rowIds };
}

/**
 * Update multiple cells at once
 */
async function bulkUpdate(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  if (!tableId) {
    throw new Error("tableId is required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const updates = args.updates as Array<{
    rowId: string;
    columnId: string;
    value: unknown;
  }>;
  if (!updates || !Array.isArray(updates)) {
    throw new Error("updates array is required");
  }

  for (const update of updates) {
    await memoryStore.applyEvent({
      type: "CELL_UPDATED",
      tableId,
      rowId: update.rowId,
      columnId: update.columnId,
      value: update.value,
    });
  }

  return { updated: updates.length };
}

// ============================================================
// Column operations
// ============================================================

/**
 * Reorder columns in a table
 */
async function reorderColumns(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const columnIds = args.columnIds as string[];

  if (!tableId || !columnIds || !Array.isArray(columnIds)) {
    throw new Error("tableId and columnIds array are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  // Validate all column IDs exist
  for (const colId of columnIds) {
    if (!table.columns.has(colId)) {
      throw new Error(`Column ${colId} not found`);
    }
  }

  await memoryStore.applyEvent({
    type: "COLUMN_REORDERED",
    tableId,
    columnIds,
  });

  return { success: true, order: columnIds };
}

/**
 * Change a column's data type
 */
async function changeColumnType(
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  const tableId = args.tableId as string;
  const columnId = args.columnId as string;
  const newType = args.newType as ColumnType;

  if (!tableId || !columnId || !newType) {
    throw new Error("tableId, columnId, and newType are required");
  }

  if (!verifyTableAccess(tableId, userId)) {
    throw new Error("Table not found or access denied");
  }

  const table = memoryStore.getTable(tableId);
  if (!table) {
    throw new Error("Table not found");
  }

  const column = table.columns.get(columnId);
  if (!column) {
    throw new Error("Column not found");
  }

  await memoryStore.applyEvent({
    type: "COLUMN_TYPE_CHANGED",
    tableId,
    columnId,
    fromType: column.dataType,
    toType: newType,
  });

  return {
    columnId,
    name: column.name,
    fromType: column.dataType,
    toType: newType,
  };
}
