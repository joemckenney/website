import { type Static, Type } from "typebox";

/**
 * Column type enum
 */
export const ColumnTypeSchema = Type.Union([
  Type.Literal("text"),
  Type.Literal("number"),
  Type.Literal("boolean"),
  Type.Literal("date"),
  Type.Literal("select"),
  Type.Literal("relation"),
]);
export type ColumnTypeType = Static<typeof ColumnTypeSchema>;

/**
 * Column schema
 */
export const Column = Type.Object({
  id: Type.String({ description: "Column ID (UUID)" }),
  name: Type.String({ description: "Column display name" }),
  dataType: ColumnTypeSchema,
  position: Type.Number({ description: "Column position (0-indexed)" }),
  referencedTableId: Type.Optional(
    Type.String({ description: "Referenced table ID for relation columns" }),
  ),
});
export type ColumnType = Static<typeof Column>;

/**
 * Table schema
 */
export const Table = Type.Object({
  id: Type.String({ description: "Table ID (UUID)" }),
  userId: Type.String({ description: "Owner user ID" }),
  name: Type.String({ description: "Table name" }),
  columns: Type.Array(Column, { description: "Table columns" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type TableType = Static<typeof Table>;

/**
 * Table list item (without columns)
 */
export const TableListItem = Type.Object({
  id: Type.String({ description: "Table ID (UUID)" }),
  name: Type.String({ description: "Table name" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type TableListItemType = Static<typeof TableListItem>;

/**
 * Base schema (container for tables, like an Excel workbook)
 */
export const Base = Type.Object({
  id: Type.String({ description: "Base ID (UUID)" }),
  userId: Type.String({ description: "Owner user ID" }),
  name: Type.String({ description: "Base name" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type BaseType = Static<typeof Base>;

/**
 * Base list item with table count
 */
export const BaseListItem = Type.Object({
  id: Type.String({ description: "Base ID (UUID)" }),
  name: Type.String({ description: "Base name" }),
  tableCount: Type.Number({ description: "Number of tables in this base" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type BaseListItemType = Static<typeof BaseListItem>;

/**
 * Base with its tables
 */
export const BaseWithTables = Type.Object({
  id: Type.String({ description: "Base ID (UUID)" }),
  userId: Type.String({ description: "Owner user ID" }),
  name: Type.String({ description: "Base name" }),
  tables: Type.Array(TableListItem, { description: "Tables in this base" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type BaseWithTablesType = Static<typeof BaseWithTables>;

/**
 * Row schema
 */
export const Row = Type.Object({
  id: Type.String({ description: "Row ID (UUID)" }),
  data: Type.Record(Type.String(), Type.Unknown(), {
    description: "Column values keyed by column ID",
  }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type RowType = Static<typeof Row>;

/**
 * Paginated rows response
 */
export const RowsResponse = Type.Object({
  rows: Type.Array(Row),
  total: Type.Number({ description: "Total number of rows" }),
  offset: Type.Number({ description: "Current offset" }),
  limit: Type.Number({ description: "Page size" }),
});
export type RowsResponseType = Static<typeof RowsResponse>;

// Request bodies

export const CreateBaseBody = Type.Object({
  name: Type.String({ description: "Base name", minLength: 1 }),
});
export type CreateBaseBodyType = Static<typeof CreateBaseBody>;

export const UpdateBaseBody = Type.Object({
  name: Type.String({ description: "New base name", minLength: 1 }),
});
export type UpdateBaseBodyType = Static<typeof UpdateBaseBody>;

export const CreateTableBody = Type.Object({
  baseId: Type.String({ description: "Base ID to create the table in" }),
  name: Type.String({ description: "Table name", minLength: 1 }),
  columns: Type.Optional(
    Type.Array(
      Type.Object({
        name: Type.String({ description: "Column name", minLength: 1 }),
        dataType: ColumnTypeSchema,
      }),
    ),
  ),
});
export type CreateTableBodyType = Static<typeof CreateTableBody>;

export const UpdateTableBody = Type.Object({
  name: Type.String({ description: "New table name", minLength: 1 }),
});
export type UpdateTableBodyType = Static<typeof UpdateTableBody>;

export const AddColumnBody = Type.Object({
  name: Type.String({ description: "Column name", minLength: 1 }),
  dataType: ColumnTypeSchema,
  referencedTableId: Type.Optional(
    Type.String({
      description: "Referenced table ID (required for relation type)",
    }),
  ),
});
export type AddColumnBodyType = Static<typeof AddColumnBody>;

export const UpdateColumnBody = Type.Object({
  name: Type.Optional(Type.String({ description: "New column name" })),
  dataType: Type.Optional(ColumnTypeSchema),
});
export type UpdateColumnBodyType = Static<typeof UpdateColumnBody>;

export const ReorderColumnsBody = Type.Object({
  columnIds: Type.Array(Type.String(), {
    description: "Column IDs in new order",
  }),
});
export type ReorderColumnsBodyType = Static<typeof ReorderColumnsBody>;

export const InsertRowBody = Type.Object({
  data: Type.Optional(
    Type.Record(Type.String(), Type.Unknown(), {
      description: "Initial column values",
    }),
  ),
});
export type InsertRowBodyType = Static<typeof InsertRowBody>;

export const UpdateRowBody = Type.Object({
  data: Type.Record(Type.String(), Type.Unknown(), {
    description: "Column values to update",
  }),
});
export type UpdateRowBodyType = Static<typeof UpdateRowBody>;

export const BulkRowsBody = Type.Object({
  operation: Type.Union([Type.Literal("delete")]),
  rowIds: Type.Array(Type.String(), { description: "Row IDs to operate on" }),
});
export type BulkRowsBodyType = Static<typeof BulkRowsBody>;

// Path parameters

export const BaseIdParams = Type.Object({
  baseId: Type.String({ description: "Base ID" }),
});
export type BaseIdParamsType = Static<typeof BaseIdParams>;

export const TableIdParams = Type.Object({
  tableId: Type.String({ description: "Table ID" }),
});
export type TableIdParamsType = Static<typeof TableIdParams>;

export const ColumnIdParams = Type.Object({
  tableId: Type.String({ description: "Table ID" }),
  columnId: Type.String({ description: "Column ID" }),
});
export type ColumnIdParamsType = Static<typeof ColumnIdParams>;

export const RowIdParams = Type.Object({
  tableId: Type.String({ description: "Table ID" }),
  rowId: Type.String({ description: "Row ID" }),
});
export type RowIdParamsType = Static<typeof RowIdParams>;

// Query parameters

export const TablesQueryParams = Type.Object({
  baseId: Type.Optional(Type.String({ description: "Filter by base ID" })),
});
export type TablesQueryParamsType = Static<typeof TablesQueryParams>;

export const RowsQueryParams = Type.Object({
  offset: Type.Optional(Type.Number({ description: "Pagination offset" })),
  limit: Type.Optional(Type.Number({ description: "Page size (default 50)" })),
  sortBy: Type.Optional(Type.String({ description: "Column ID to sort by" })),
  sortOrder: Type.Optional(
    Type.Union([Type.Literal("asc"), Type.Literal("desc")]),
  ),
});
export type RowsQueryParamsType = Static<typeof RowsQueryParams>;

// Agent schemas

export const TableAgentSchema = Type.Object({
  id: Type.String({ description: "Agent ID (UUID)" }),
  tableId: Type.String({ description: "Table ID" }),
  name: Type.String({ description: "Agent name" }),
  enabled: Type.Boolean({ description: "Whether the agent is enabled" }),
  triggerType: Type.String({
    description: "Trigger type: on_row_insert or on_cell_update",
  }),
  watchColumns: Type.Array(Type.String(), {
    description: "Column IDs that trigger the agent",
  }),
  inputColumns: Type.Array(Type.String(), {
    description: "Column IDs the agent reads",
  }),
  outputColumns: Type.Array(Type.String(), {
    description: "Column IDs the agent writes",
  }),
  prompt: Type.String({ description: "Agent prompt/instructions" }),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type TableAgentSchemaType = Static<typeof TableAgentSchema>;

export const ToggleAgentBody = Type.Object({
  enabled: Type.Boolean({ description: "Whether the agent should be enabled" }),
});
export type ToggleAgentBodyType = Static<typeof ToggleAgentBody>;

export const AgentIdParams = Type.Object({
  tableId: Type.String({ description: "Table ID" }),
  agentId: Type.String({ description: "Agent ID" }),
});
export type AgentIdParamsType = Static<typeof AgentIdParams>;

// Response schemas

export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});
export type ErrorResponseType = Static<typeof ErrorResponse>;

export const HealthResponse = Type.Object({
  status: Type.String({ description: "Health status" }),
  timestamp: Type.String({ description: "Current timestamp" }),
});
export type HealthResponseType = Static<typeof HealthResponse>;
