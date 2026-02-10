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
import { agentGraph } from "../agents/graph.js";
import { agentRunner } from "../agents/runner.js";
import { prisma } from "../db/client.js";
import type { ColumnType } from "../lib/events.js";
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
    {
      name: "create-agent",
      description:
        'Create an AI automation agent for the current table. The agent watches for row inserts or cell updates and automatically fills in output columns using AI. triggerType must be "on_row_insert" or "on_cell_update". For "on_cell_update", watchColumns specifies which columns trigger the agent. inputColumns are read by the agent, outputColumns are written to.',
      inputSchema: {
        type: "object",
        properties: {
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
        "List all AI automation agents for the current table, including their trigger type, columns, and enabled status.",
      inputSchema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "update-agent",
      description: "Update an existing AI automation agent's configuration.",
      inputSchema: {
        type: "object",
        properties: {
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
      description: "Delete an AI automation agent from the current table.",
      inputSchema: {
        type: "object",
        properties: {
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
      description: "Enable or disable an AI automation agent.",
      inputSchema: {
        type: "object",
        properties: {
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
