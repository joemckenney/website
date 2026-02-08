/**
 * Yjs Materializer
 *
 * Asynchronously materializes Yjs document state to PostgreSQL.
 * This enables SQL queries, search, and reporting on table data.
 *
 * The materializer is eventually consistent - Yjs is the source of truth.
 *
 * Note: This is a simplified implementation that updates TableMeta.
 * Full row/column materialization requires database migrations for
 * MaterializedRow and MaterializedColumn tables.
 */

import * as Y from "yjs";
import { prisma } from "../db/client.js";
import { getColumns, getRows, getTableMeta } from "./schema.js";

// Queue of tables pending materialization
const pendingMaterializations = new Map<string, Y.Doc>();

// Debounce timer
let materializeTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1000;

/**
 * Queue a table for materialization
 */
export function queueMaterialization(tableId: string, doc: Y.Doc): void {
  pendingMaterializations.set(tableId, doc);

  // Debounce materialization
  if (materializeTimeout) {
    clearTimeout(materializeTimeout);
  }

  materializeTimeout = setTimeout(() => {
    processMaterializationQueue().catch(console.error);
  }, DEBOUNCE_MS);
}

/**
 * Process all pending materializations
 */
async function processMaterializationQueue(): Promise<void> {
  const pending = new Map(pendingMaterializations);
  pendingMaterializations.clear();
  materializeTimeout = null;

  for (const [tableId, doc] of pending) {
    try {
      await materializeTable(tableId, doc);
    } catch (err) {
      console.error(`Error materializing table ${tableId}:`, err);
    }
  }
}

/**
 * Materialize a single table to PostgreSQL
 *
 * For now, this only updates TableMeta. Full materialization of rows and columns
 * requires MaterializedRow and MaterializedColumn tables to be created via migration.
 */
async function materializeTable(tableId: string, doc: Y.Doc): Promise<void> {
  const meta = getTableMeta(doc);
  const columns = getColumns(doc);
  const rows = getRows(doc);

  console.log(
    `Materializing table ${tableId}: ${columns.length} columns, ${rows.length} rows`,
  );

  // Update table metadata
  await prisma.tableMeta.update({
    where: { id: tableId },
    data: {
      name: meta.name,
      updatedAt: new Date(meta.updatedAt),
    },
  });

  // TODO: When MaterializedRow and MaterializedColumn tables exist,
  // sync columns and rows here. For now, we only update metadata.
  //
  // The full implementation would:
  // 1. Upsert all columns from the Yjs doc
  // 2. Upsert all rows from the Yjs doc
  // 3. Delete columns/rows that no longer exist in Yjs

  console.log(`Materialized table ${tableId} metadata successfully`);
}

/**
 * Query rows directly from Yjs document
 *
 * This is used when PostgreSQL materialization isn't available.
 */
export function queryRowsFromDoc(
  doc: Y.Doc,
  options: {
    offset?: number;
    limit?: number;
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
  const { offset = 0, limit = 50 } = options;
  const allRows = getRows(doc);

  return {
    rows: allRows.slice(offset, offset + limit),
    total: allRows.length,
  };
}

/**
 * Force immediate materialization (for testing)
 */
export async function forceMaterialization(): Promise<void> {
  if (materializeTimeout) {
    clearTimeout(materializeTimeout);
    materializeTimeout = null;
  }
  await processMaterializationQueue();
}
