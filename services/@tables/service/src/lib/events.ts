/**
 * Column data types supported by the tables system
 */
export type ColumnType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "select"
  | "relation";

/**
 * Table events for the write-ahead log (WAL)
 * Each mutation is recorded as an event for durability and recovery
 */
export type TableEvent =
  | { type: "TABLE_CREATED"; tableId: string; userId: string; name: string }
  | { type: "TABLE_RENAMED"; tableId: string; name: string }
  | { type: "TABLE_DELETED"; tableId: string }
  | {
      type: "COLUMN_ADDED";
      tableId: string;
      columnId: string;
      name: string;
      dataType: ColumnType;
      position: number;
      referencedTableId?: string;
    }
  | { type: "COLUMN_RENAMED"; tableId: string; columnId: string; name: string }
  | {
      type: "COLUMN_TYPE_CHANGED";
      tableId: string;
      columnId: string;
      fromType: ColumnType;
      toType: ColumnType;
    }
  | { type: "COLUMN_DELETED"; tableId: string; columnId: string }
  | { type: "COLUMN_REORDERED"; tableId: string; columnIds: string[] }
  | {
      type: "ROW_INSERTED";
      tableId: string;
      rowId: string;
      data: Record<string, unknown>;
      originAgentId?: string;
    }
  | {
      type: "ROW_UPDATED";
      tableId: string;
      rowId: string;
      data: Record<string, unknown>;
    }
  | {
      type: "CELL_UPDATED";
      tableId: string;
      rowId: string;
      columnId: string;
      value: unknown;
      originAgentId?: string;
    }
  | { type: "ROW_DELETED"; tableId: string; rowId: string }
  | { type: "ROWS_BULK_DELETED"; tableId: string; rowIds: string[] };

/**
 * Get the event type category for logging/metrics
 */
export function getEventCategory(
  event: TableEvent,
): "schema" | "data" | "table" {
  switch (event.type) {
    case "TABLE_CREATED":
    case "TABLE_RENAMED":
    case "TABLE_DELETED":
      return "table";
    case "COLUMN_ADDED":
    case "COLUMN_RENAMED":
    case "COLUMN_TYPE_CHANGED":
    case "COLUMN_DELETED":
    case "COLUMN_REORDERED":
      return "schema";
    case "ROW_INSERTED":
    case "ROW_UPDATED":
    case "CELL_UPDATED":
    case "ROW_DELETED":
    case "ROWS_BULK_DELETED":
      return "data";
  }
}
