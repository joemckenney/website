import { config } from "../config.js";
import { prisma } from "../db/client.js";
import type { ColumnType, TableEvent } from "../lib/events.js";
import { wal } from "./wal.js";

/**
 * Map our column types to PostgreSQL types
 */
function toPgType(columnType: ColumnType): string {
  switch (columnType) {
    case "text":
    case "select":
      return "TEXT";
    case "date":
      return "TIMESTAMPTZ";
    case "number":
      return "NUMERIC";
    case "boolean":
      return "BOOLEAN";
  }
}

/**
 * Sanitize column ID for PostgreSQL (must be a valid identifier)
 */
function sanitizeColumnIdPg(columnId: string): string {
  return `c_${columnId.replace(/-/g, "")}`;
}

/**
 * Get the PostgreSQL table name for a user table
 */
function getPgTableName(tableId: string): string {
  return `tables_data.ut_${tableId.replace(/-/g, "")}`;
}

/**
 * PostgreSQL Materializer
 *
 * Consumes events from the WAL and applies them to PostgreSQL.
 * Runs as a background worker, off the hot path.
 *
 * This provides:
 * - Durable backup of all data
 * - Analytics queries on real PostgreSQL
 * - Fallback for tables too large for memory
 */
export class Materializer {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  /**
   * Start the materializer background worker
   */
  start(): void {
    if (this.intervalId) return;

    console.log(
      `Starting materializer (interval: ${config.materializerIntervalMs}ms, batch: ${config.materializerBatchSize})`,
    );

    // Ensure schema exists
    this.ensureSchema().catch(console.error);

    this.intervalId = setInterval(() => {
      this.sync().catch(console.error);
    }, config.materializerIntervalMs);
  }

  /**
   * Stop the materializer
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log("Materializer stopped");
  }

  /**
   * Ensure the tables_data schema exists
   */
  private async ensureSchema(): Promise<void> {
    await prisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS tables_data");
  }

  /**
   * Sync pending events to PostgreSQL
   */
  private async sync(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const events = await wal.getPendingEvents(config.materializerBatchSize);

      if (events.length === 0) {
        return;
      }

      // Group events by table for efficient batching
      const byTable = new Map<string, typeof events>();
      for (const event of events) {
        if (!byTable.has(event.tableId)) {
          byTable.set(event.tableId, []);
        }
        byTable.get(event.tableId)!.push(event);
      }

      // Process each table's events
      for (const [tableId, tableEvents] of byTable) {
        try {
          for (const event of tableEvents) {
            await this.applyToPostgres(event.payload);
          }

          // Mark as applied
          await wal.markAsApplied(tableEvents.map((e) => e.id));
        } catch (err) {
          console.error(`Error applying events for table ${tableId}:`, err);
          // Continue with other tables
        }
      }
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Apply a single event to PostgreSQL
   */
  private async applyToPostgres(event: TableEvent): Promise<void> {
    switch (event.type) {
      case "TABLE_CREATED": {
        const tableName = getPgTableName(event.tableId);
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS ${tableName} (
            _id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            _created_at TIMESTAMPTZ DEFAULT NOW(),
            _updated_at TIMESTAMPTZ DEFAULT NOW()
          )
        `);
        break;
      }

      case "TABLE_DELETED": {
        const tableName = getPgTableName(event.tableId);
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${tableName}`);
        break;
      }

      case "COLUMN_ADDED": {
        const tableName = getPgTableName(event.tableId);
        const colName = sanitizeColumnIdPg(event.columnId);
        const colType = toPgType(event.dataType);
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${colType}`,
        );
        break;
      }

      case "COLUMN_TYPE_CHANGED": {
        const tableName = getPgTableName(event.tableId);
        const colName = sanitizeColumnIdPg(event.columnId);
        const newType = toPgType(event.toType);
        // PostgreSQL allows ALTER COLUMN TYPE with USING for conversion
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${newType} USING ${colName}::${newType}`,
        );
        break;
      }

      case "COLUMN_DELETED": {
        const tableName = getPgTableName(event.tableId);
        const colName = sanitizeColumnIdPg(event.columnId);
        await prisma.$executeRawUnsafe(
          `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${colName}`,
        );
        break;
      }

      case "ROW_INSERTED": {
        const tableName = getPgTableName(event.tableId);
        const columns = Object.keys(event.data);

        if (columns.length === 0) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO ${tableName} (_id) VALUES ('${event.rowId}')`,
          );
        } else {
          const colNames = columns.map((c) => sanitizeColumnIdPg(c)).join(", ");
          const placeholders = columns.map((_, i) => `$${i + 2}`).join(", ");
          const values = columns.map((c) => event.data[c]);

          // Use parameterized query for safety
          await prisma.$executeRawUnsafe(
            `INSERT INTO ${tableName} (_id, ${colNames}) VALUES ($1, ${placeholders})`,
            event.rowId,
            ...values,
          );
        }
        break;
      }

      case "ROW_UPDATED": {
        const tableName = getPgTableName(event.tableId);
        const columns = Object.keys(event.data);

        if (columns.length > 0) {
          const updates = columns
            .map((c, i) => `${sanitizeColumnIdPg(c)} = $${i + 1}`)
            .join(", ");
          const values = columns.map((c) => event.data[c]);

          await prisma.$executeRawUnsafe(
            `UPDATE ${tableName} SET ${updates}, _updated_at = NOW() WHERE _id = $${columns.length + 1}`,
            ...values,
            event.rowId,
          );
        }
        break;
      }

      case "CELL_UPDATED": {
        const tableName = getPgTableName(event.tableId);
        const colName = sanitizeColumnIdPg(event.columnId);

        await prisma.$executeRawUnsafe(
          `UPDATE ${tableName} SET ${colName} = $1, _updated_at = NOW() WHERE _id = $2`,
          event.value,
          event.rowId,
        );
        break;
      }

      case "ROW_DELETED": {
        const tableName = getPgTableName(event.tableId);
        await prisma.$executeRawUnsafe(
          `DELETE FROM ${tableName} WHERE _id = $1`,
          event.rowId,
        );
        break;
      }

      case "ROWS_BULK_DELETED": {
        const tableName = getPgTableName(event.tableId);
        const placeholders = event.rowIds.map((_, i) => `$${i + 1}`).join(", ");
        await prisma.$executeRawUnsafe(
          `DELETE FROM ${tableName} WHERE _id IN (${placeholders})`,
          ...event.rowIds,
        );
        break;
      }

      // TABLE_RENAMED, COLUMN_RENAMED, COLUMN_REORDERED are metadata-only
      // They don't affect the PostgreSQL schema
    }
  }
}
