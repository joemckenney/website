import type { ColumnType } from "./events.js";

/**
 * Map our column types to SQLite types
 */
export function toSqliteType(columnType: ColumnType): string {
  switch (columnType) {
    case "text":
    case "select":
    case "date":
      return "TEXT";
    case "number":
      return "REAL";
    case "boolean":
      return "INTEGER"; // SQLite uses 0/1 for booleans
    case "relation":
      return "TEXT";
  }
}

/**
 * Sanitize column ID for use in SQL (must be a valid identifier)
 */
export function sanitizeColumnId(columnId: string): string {
  // Column IDs are UUIDs, so we prefix with 'c_' and replace hyphens
  return `c_${columnId.replace(/-/g, "")}`;
}

/**
 * Generate the initial CREATE TABLE statement for a new table
 */
export function createTableSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS data (
      _id TEXT PRIMARY KEY,
      _created_at TEXT DEFAULT (datetime('now')),
      _updated_at TEXT DEFAULT (datetime('now'))
    )
  `;
}

/**
 * Coerce a value to the appropriate type for storage
 */
export function coerceValue(
  value: unknown,
  columnType: ColumnType,
): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  switch (columnType) {
    case "text":
    case "select":
    case "relation":
      return String(value);
    case "date":
      // Store dates as ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return String(value);
    case "number": {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }
    case "boolean":
      // SQLite stores booleans as 0/1
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      if (typeof value === "number") {
        return value ? 1 : 0;
      }
      if (typeof value === "string") {
        return value.toLowerCase() === "true" || value === "1" ? 1 : 0;
      }
      return value ? 1 : 0;
  }
}

/**
 * Convert a SQLite value back to our type system
 */
export function fromSqliteValue(
  value: unknown,
  columnType: ColumnType,
): unknown {
  if (value === null || value === undefined) {
    return null;
  }

  switch (columnType) {
    case "text":
    case "select":
    case "date":
    case "relation":
      return String(value);
    case "number":
      return Number(value);
    case "boolean":
      return value === 1;
  }
}
