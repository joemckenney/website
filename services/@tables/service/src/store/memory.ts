import Database from "better-sqlite3";
import { prisma } from "../db/client.js";
import type { ColumnType, TableEvent } from "../lib/events.js";
import {
  coerceValue,
  createTableSql,
  sanitizeColumnId,
  toSqliteType,
} from "../lib/sqlite.js";
import { wal } from "./wal.js";

/**
 * Column metadata stored in SQLite
 */
interface ColumnMeta {
  id: string;
  name: string;
  dataType: ColumnType;
  position: number;
  referencedTableId?: string;
}

/**
 * In-memory table state
 */
interface TableState {
  db: Database.Database;
  columns: Map<string, ColumnMeta>;
  userId: string;
  name: string;
  baseId: string;
}

/**
 * Memory Store Manager
 *
 * Uses SQLite in-memory databases for fast reads and writes.
 * Each table gets its own SQLite database instance.
 *
 * On startup, state is recovered by replaying events from the WAL.
 */
class MemoryStore {
  private tables = new Map<string, TableState>();
  private eventListeners = new Map<string, Set<(event: TableEvent) => void>>();
  private dependencyGraph = new Map<string, Set<string>>();

  /**
   * Initialize the memory store by replaying WAL events
   */
  async initialize(): Promise<void> {
    console.log("Initializing memory store from WAL...");

    // Get all active tables from table metadata
    const tableMetas = await prisma.tableMeta.findMany();

    for (const meta of tableMetas) {
      await this.replayTable(meta.id, meta.userId, meta.name, meta.baseId);
    }

    this.rebuildDependencyGraph();

    console.log(`Memory store initialized with ${this.tables.size} tables`);
  }

  /**
   * Replay events for a specific table
   *
   * Always replays ALL events from the beginning since SQLite :memory:
   * is lost on restart. Checkpoints are only used by the materializer.
   */
  private async replayTable(
    tableId: string,
    userId: string,
    name: string,
    baseId: string,
  ): Promise<void> {
    // Always replay from the beginning - SQLite :memory: doesn't persist
    const events = await wal.getEventsSince(tableId, 0n);

    // Create fresh database and replay events
    const db = new Database(":memory:");
    db.exec(createTableSql());

    const state: TableState = {
      db,
      columns: new Map(),
      userId,
      name,
      baseId,
    };

    for (const event of events) {
      this.applyEventToSqlite(state, event.payload);
    }

    this.tables.set(tableId, state);

    if (events.length > 0) {
      console.log(
        `  Replayed ${events.length} events for table ${tableId} (${state.columns.size} columns)`,
      );
    }
  }

  /**
   * Get or create a table's in-memory state
   */
  getTable(tableId: string): TableState | undefined {
    return this.tables.get(tableId);
  }

  /**
   * Check if a table exists
   */
  hasTable(tableId: string): boolean {
    return this.tables.has(tableId);
  }

  /**
   * Get all tables for a user
   */
  getTablesForUser(userId: string): Array<{ id: string; name: string }> {
    const result: Array<{ id: string; name: string }> = [];
    for (const [id, state] of this.tables) {
      if (state.userId === userId) {
        result.push({ id, name: state.name });
      }
    }
    return result;
  }

  /**
   * Apply an event to the memory store and WAL
   */
  async applyEvent(event: TableEvent): Promise<void> {
    // 1. Append to WAL first (durable write)
    await wal.append(event);

    // 2. Apply to SQLite (instant)
    if (event.type === "TABLE_CREATED") {
      // Create new table state
      const db = new Database(":memory:");
      db.exec(createTableSql());
      this.tables.set(event.tableId, {
        db,
        columns: new Map(),
        userId: event.userId,
        name: event.name,
        baseId: "",
      });
    } else if (event.type === "TABLE_DELETED") {
      // Remove table state
      const state = this.tables.get(event.tableId);
      if (state) {
        state.db.close();
        this.tables.delete(event.tableId);
      }
    } else {
      // Apply to existing table
      const state = this.tables.get(event.tableId);
      if (state) {
        this.applyEventToSqlite(state, event);

        // Update dependency graph for relation columns
        if (
          event.type === "COLUMN_ADDED" &&
          event.dataType === "relation" &&
          event.referencedTableId
        ) {
          this.addDependencyEdge(event.tableId, event.referencedTableId);
        } else if (event.type === "COLUMN_DELETED") {
          this.rebuildDependencyGraph();
        }
      }
    }

    // 3. Broadcast to listeners
    this.broadcast(event);
  }

  /**
   * Apply an event to the SQLite database
   */
  private applyEventToSqlite(state: TableState, event: TableEvent): void {
    const { db, columns } = state;

    switch (event.type) {
      case "TABLE_RENAMED":
        state.name = event.name;
        break;

      case "COLUMN_ADDED": {
        const colId = sanitizeColumnId(event.columnId);
        const sqlType = toSqliteType(event.dataType);
        db.exec(`ALTER TABLE data ADD COLUMN ${colId} ${sqlType}`);
        columns.set(event.columnId, {
          id: event.columnId,
          name: event.name,
          dataType: event.dataType,
          position: event.position,
          ...(event.referencedTableId
            ? { referencedTableId: event.referencedTableId }
            : {}),
        });
        break;
      }

      case "COLUMN_RENAMED": {
        const col = columns.get(event.columnId);
        if (col) {
          col.name = event.name;
        }
        break;
      }

      case "COLUMN_TYPE_CHANGED": {
        const col = columns.get(event.columnId);
        if (col) {
          col.dataType = event.toType;
        }
        // Note: SQLite doesn't support ALTER COLUMN TYPE directly
        // For now we just update metadata; data coercion happens on read
        break;
      }

      case "COLUMN_DELETED": {
        columns.delete(event.columnId);
        // SQLite doesn't support DROP COLUMN in older versions
        // We keep the column in the table but remove from metadata
        break;
      }

      case "COLUMN_REORDERED": {
        event.columnIds.forEach((colId, index) => {
          const col = columns.get(colId);
          if (col) {
            col.position = index;
          }
        });
        break;
      }

      case "ROW_INSERTED": {
        const colIds = Array.from(columns.keys());
        const colNames = colIds.map((id) => sanitizeColumnId(id));
        const placeholders = colIds.map(() => "?").join(", ");

        const values = [
          event.rowId,
          ...colIds.map((id) => {
            const value = event.data[id];
            const col = columns.get(id);
            return col
              ? coerceValue(value, col.dataType)
              : value === undefined
                ? null
                : value;
          }),
        ];

        const sql =
          colNames.length > 0
            ? `INSERT INTO data (_id, ${colNames.join(", ")}) VALUES (?, ${placeholders})`
            : `INSERT INTO data (_id) VALUES (?)`;

        db.prepare(sql).run(values);
        break;
      }

      case "ROW_UPDATED": {
        const updates = Object.entries(event.data)
          .map(([colId]) => `${sanitizeColumnId(colId)} = ?`)
          .join(", ");

        if (updates) {
          const values = [
            ...Object.entries(event.data).map(([colId, value]) => {
              const col = columns.get(colId);
              return col ? coerceValue(value, col.dataType) : value;
            }),
            new Date().toISOString(),
            event.rowId,
          ];
          db.prepare(
            `UPDATE data SET ${updates}, _updated_at = ? WHERE _id = ?`,
          ).run(values);
        }
        break;
      }

      case "CELL_UPDATED": {
        const colId = sanitizeColumnId(event.columnId);
        const col = columns.get(event.columnId);
        const coerced = col
          ? coerceValue(event.value, col.dataType)
          : event.value;
        db.prepare(
          `UPDATE data SET ${colId} = ?, _updated_at = ? WHERE _id = ?`,
        ).run(coerced, new Date().toISOString(), event.rowId);
        break;
      }

      case "ROW_DELETED": {
        db.prepare("DELETE FROM data WHERE _id = ?").run(event.rowId);
        break;
      }

      case "ROWS_BULK_DELETED": {
        const placeholders = event.rowIds.map(() => "?").join(", ");
        db.prepare(`DELETE FROM data WHERE _id IN (${placeholders})`).run(
          event.rowIds,
        );
        break;
      }
    }
  }

  /**
   * Query rows from a table
   */
  queryRows(
    tableId: string,
    options: {
      offset?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {},
  ): {
    rows: Array<{
      id: string;
      data: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
  } {
    const state = this.tables.get(tableId);
    if (!state) {
      return { rows: [], total: 0 };
    }

    const { db, columns } = state;
    const { offset = 0, limit = 50, sortBy, sortOrder = "asc" } = options;

    // Build column list for SELECT
    const colIds = Array.from(columns.keys());
    const selectCols = [
      "_id",
      "_created_at",
      "_updated_at",
      ...colIds.map((id) => sanitizeColumnId(id)),
    ].join(", ");

    // Count total
    const countResult = db
      .prepare("SELECT COUNT(*) as count FROM data")
      .get() as { count: number };
    const total = countResult.count;

    // Build ORDER BY
    let orderBy = "_created_at DESC";
    if (sortBy) {
      const sortCol =
        sortBy === "_created_at" || sortBy === "_updated_at"
          ? sortBy
          : sanitizeColumnId(sortBy);
      orderBy = `${sortCol} ${sortOrder.toUpperCase()}`;
    }

    // Query with pagination
    const sql = `SELECT ${selectCols} FROM data ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const rawRows = db.prepare(sql).all(limit, offset) as Array<
      Record<string, unknown>
    >;

    // Transform rows to use column IDs as keys
    const rows = rawRows.map((row) => {
      const data: Record<string, unknown> = {};
      for (const [colId, meta] of columns) {
        const sqlCol = sanitizeColumnId(colId);
        const rawValue = row[sqlCol];
        if (meta.dataType === "relation" && meta.referencedTableId) {
          data[colId] = this.resolveRelationDisplay(
            meta.referencedTableId,
            rawValue as string | null,
          );
        } else {
          data[colId] = rawValue;
        }
      }
      return {
        id: row._id as string,
        data,
        createdAt: row._created_at as string,
        updatedAt: row._updated_at as string,
      };
    });

    return { rows, total };
  }

  /**
   * Get a single row by ID
   */
  getRow(
    tableId: string,
    rowId: string,
  ): {
    id: string;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  } | null {
    const state = this.tables.get(tableId);
    if (!state) {
      return null;
    }

    const { db, columns } = state;
    const colIds = Array.from(columns.keys());
    const selectCols = [
      "_id",
      "_created_at",
      "_updated_at",
      ...colIds.map((id) => sanitizeColumnId(id)),
    ].join(", ");

    const row = db
      .prepare(`SELECT ${selectCols} FROM data WHERE _id = ?`)
      .get(rowId) as Record<string, unknown> | undefined;

    if (!row) {
      return null;
    }

    const data: Record<string, unknown> = {};
    for (const [colId, meta] of columns) {
      const sqlCol = sanitizeColumnId(colId);
      const rawValue = row[sqlCol];
      if (meta.dataType === "relation" && meta.referencedTableId) {
        data[colId] = this.resolveRelationDisplay(
          meta.referencedTableId,
          rawValue as string | null,
        );
      } else {
        data[colId] = rawValue;
      }
    }

    return {
      id: row._id as string,
      data,
      createdAt: row._created_at as string,
      updatedAt: row._updated_at as string,
    };
  }

  /**
   * Set the baseId on a table state (called from route handler after TABLE_CREATED)
   */
  setTableBaseId(tableId: string, baseId: string): void {
    const state = this.tables.get(tableId);
    if (state) {
      state.baseId = baseId;
    }
  }

  /**
   * Rebuild the dependency graph from all relation columns
   */
  private rebuildDependencyGraph(): void {
    this.dependencyGraph.clear();
    for (const [tableId, state] of this.tables) {
      for (const col of state.columns.values()) {
        if (
          col.dataType === "relation" &&
          col.referencedTableId &&
          col.referencedTableId !== tableId
        ) {
          if (!this.dependencyGraph.has(tableId)) {
            this.dependencyGraph.set(tableId, new Set());
          }
          this.dependencyGraph.get(tableId)!.add(col.referencedTableId);
        }
      }
    }
  }

  /**
   * Check if adding an edge sourceTableId → targetTableId would create a cycle
   */
  wouldCreateCycle(sourceTableId: string, targetTableId: string): boolean {
    // Self-references are allowed
    if (sourceTableId === targetTableId) return false;

    // DFS from targetTableId: if we can reach sourceTableId, adding the edge creates a cycle
    const visited = new Set<string>();
    const stack = [targetTableId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current === sourceTableId) return true;
      if (visited.has(current)) continue;
      visited.add(current);
      const neighbors = this.dependencyGraph.get(current);
      if (neighbors) {
        for (const neighbor of neighbors) {
          stack.push(neighbor);
        }
      }
    }
    return false;
  }

  /**
   * Add an edge to the dependency graph
   */
  private addDependencyEdge(
    sourceTableId: string,
    targetTableId: string,
  ): void {
    if (sourceTableId === targetTableId) return;
    if (!this.dependencyGraph.has(sourceTableId)) {
      this.dependencyGraph.set(sourceTableId, new Set());
    }
    this.dependencyGraph.get(sourceTableId)!.add(targetTableId);
  }

  /**
   * Resolve display value for a relation cell
   */
  private resolveRelationDisplay(
    referencedTableId: string,
    rowId: string | null,
  ): { id: string; display: string | null } | null {
    if (rowId === null || rowId === undefined) return null;

    const refState = this.tables.get(referencedTableId);
    if (!refState) return { id: rowId, display: null };

    // Find the primary field (first text column by position)
    let primaryCol: ColumnMeta | null = null;
    for (const col of refState.columns.values()) {
      if (col.dataType === "text") {
        if (!primaryCol || col.position < primaryCol.position) {
          primaryCol = col;
        }
      }
    }

    // Get the referenced row (use raw getRow to avoid infinite recursion on nested relations)
    const row = this.getRawRow(referencedTableId, rowId);
    if (!row) return { id: rowId, display: null };

    const display = primaryCol
      ? ((row.data[primaryCol.id] as string | null) ?? null)
      : null;
    return { id: rowId, display };
  }

  /**
   * Get a raw row without relation resolution (to avoid recursion)
   */
  private getRawRow(
    tableId: string,
    rowId: string,
  ): {
    id: string;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  } | null {
    const state = this.tables.get(tableId);
    if (!state) return null;

    const { db, columns } = state;
    const colIds = Array.from(columns.keys());
    const selectCols = [
      "_id",
      "_created_at",
      "_updated_at",
      ...colIds.map((id) => sanitizeColumnId(id)),
    ].join(", ");

    const row = db
      .prepare(`SELECT ${selectCols} FROM data WHERE _id = ?`)
      .get(rowId) as Record<string, unknown> | undefined;
    if (!row) return null;

    const data: Record<string, unknown> = {};
    for (const [colId] of columns) {
      const sqlCol = sanitizeColumnId(colId);
      data[colId] = row[sqlCol];
    }

    return {
      id: row._id as string,
      data,
      createdAt: row._created_at as string,
      updatedAt: row._updated_at as string,
    };
  }

  /**
   * Subscribe to events for a table (for real-time updates)
   */
  subscribe(
    tableId: string,
    callback: (event: TableEvent) => void,
  ): () => void {
    if (!this.eventListeners.has(tableId)) {
      this.eventListeners.set(tableId, new Set());
    }
    this.eventListeners.get(tableId)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(tableId)?.delete(callback);
    };
  }

  /**
   * Broadcast an event to all listeners
   */
  private broadcast(event: TableEvent): void {
    if (!("tableId" in event)) return;

    const listeners = this.eventListeners.get(event.tableId);
    if (listeners) {
      for (const callback of listeners) {
        try {
          callback(event);
        } catch (err) {
          console.error("Error in event listener:", err);
        }
      }
    }
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();
