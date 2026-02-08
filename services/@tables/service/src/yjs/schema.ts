/**
 * Yjs Document Schema for Tables
 *
 * Each table is represented as a Y.Doc with the following structure:
 *
 * meta: Y.Map<{
 *   name: string;
 *   createdAt: string;
 *   updatedAt: string;
 * }>
 *
 * columns: Y.Map<ColumnMeta>
 *   - columnId -> { id, name, dataType, position, options? }
 *
 * columnOrder: Y.Array<string>
 *   - Ordered list of column IDs for display order
 *
 * rows: Y.Map<RowData>
 *   - rowId -> { id, data: Y.Map, createdAt, updatedAt }
 *
 * rowOrder: Y.Array<string>
 *   - Ordered list of row IDs for display order
 */

import * as Y from "yjs";

export type ColumnType = "text" | "number" | "boolean" | "date" | "select";

export interface ColumnMeta {
  id: string;
  name: string;
  dataType: ColumnType;
  position: number;
  options?: string[]; // for select type
}

export interface RowMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Initialize a new Y.Doc with the table schema structure
 */
export function initializeTableDoc(
  doc: Y.Doc,
  meta: { name: string; createdAt?: string },
): void {
  doc.transact(() => {
    const metaMap = doc.getMap("meta");
    metaMap.set("name", meta.name);
    metaMap.set("createdAt", meta.createdAt ?? new Date().toISOString());
    metaMap.set("updatedAt", new Date().toISOString());

    // Initialize empty structures (they're created on first access anyway)
    doc.getMap("columns");
    doc.getArray("columnOrder");
    doc.getMap("rows");
    doc.getArray("rowOrder");
  });
}

/**
 * Get table metadata from a Y.Doc
 */
export function getTableMeta(doc: Y.Doc): {
  name: string;
  createdAt: string;
  updatedAt: string;
} {
  const meta = doc.getMap("meta");
  return {
    name: (meta.get("name") as string) ?? "Untitled",
    createdAt: (meta.get("createdAt") as string) ?? new Date().toISOString(),
    updatedAt: (meta.get("updatedAt") as string) ?? new Date().toISOString(),
  };
}

/**
 * Update table name
 */
export function updateTableName(doc: Y.Doc, name: string): void {
  doc.transact(() => {
    const meta = doc.getMap("meta");
    meta.set("name", name);
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Get all columns from a Y.Doc, sorted by position
 */
export function getColumns(doc: Y.Doc): ColumnMeta[] {
  const columnsMap = doc.getMap("columns");
  const columns: ColumnMeta[] = [];

  columnsMap.forEach((value, key) => {
    const col = value as ColumnMeta;
    columns.push({
      id: key,
      name: col.name,
      dataType: col.dataType,
      position: col.position,
      options: col.options,
    });
  });

  return columns.sort((a, b) => a.position - b.position);
}

/**
 * Add a column to the table
 */
export function addColumn(
  doc: Y.Doc,
  column: Omit<ColumnMeta, "position">,
): void {
  doc.transact(() => {
    const columnsMap = doc.getMap("columns");
    const columnOrder = doc.getArray<string>("columnOrder");

    const position = columnOrder.length;
    const columnData: ColumnMeta = {
      ...column,
      position,
    };

    columnsMap.set(column.id, columnData);
    columnOrder.push([column.id]);

    // Update table timestamp
    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Rename a column
 */
export function renameColumn(
  doc: Y.Doc,
  columnId: string,
  name: string,
): void {
  doc.transact(() => {
    const columnsMap = doc.getMap("columns");
    const existing = columnsMap.get(columnId) as ColumnMeta | undefined;

    if (existing) {
      columnsMap.set(columnId, { ...existing, name });
      const meta = doc.getMap("meta");
      meta.set("updatedAt", new Date().toISOString());
    }
  });
}

/**
 * Delete a column
 */
export function deleteColumn(doc: Y.Doc, columnId: string): void {
  doc.transact(() => {
    const columnsMap = doc.getMap("columns");
    const columnOrder = doc.getArray<string>("columnOrder");

    columnsMap.delete(columnId);

    // Remove from order array
    const index = columnOrder.toArray().indexOf(columnId);
    if (index !== -1) {
      columnOrder.delete(index, 1);
    }

    // Update remaining column positions
    const remaining = columnOrder.toArray();
    remaining.forEach((colId, idx) => {
      const col = columnsMap.get(colId) as ColumnMeta | undefined;
      if (col && col.position !== idx) {
        columnsMap.set(colId, { ...col, position: idx });
      }
    });

    // Also remove column data from all rows
    const rowsMap = doc.getMap("rows");
    rowsMap.forEach((value) => {
      const row = value as Y.Map<unknown>;
      const rowData = row.get("data") as Y.Map<unknown> | undefined;
      if (rowData) {
        rowData.delete(columnId);
      }
    });

    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Get all rows from a Y.Doc
 */
export function getRows(
  doc: Y.Doc,
): Array<{ id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string }> {
  const rowsMap = doc.getMap("rows");
  const rowOrder = doc.getArray<string>("rowOrder");
  const orderedIds = rowOrder.toArray();

  const rows: Array<{
    id: string;
    data: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }> = [];

  for (const rowId of orderedIds) {
    const row = rowsMap.get(rowId) as Y.Map<unknown> | undefined;
    if (row) {
      const dataMap = row.get("data") as Y.Map<unknown> | undefined;
      const data: Record<string, unknown> = {};

      if (dataMap) {
        dataMap.forEach((value, key) => {
          data[key] = value;
        });
      }

      rows.push({
        id: rowId,
        data,
        createdAt: (row.get("createdAt") as string) ?? new Date().toISOString(),
        updatedAt: (row.get("updatedAt") as string) ?? new Date().toISOString(),
      });
    }
  }

  return rows;
}

/**
 * Get a single row by ID
 */
export function getRow(
  doc: Y.Doc,
  rowId: string,
): { id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string } | null {
  const rowsMap = doc.getMap("rows");
  const row = rowsMap.get(rowId) as Y.Map<unknown> | undefined;

  if (!row) return null;

  const dataMap = row.get("data") as Y.Map<unknown> | undefined;
  const data: Record<string, unknown> = {};

  if (dataMap) {
    dataMap.forEach((value, key) => {
      data[key] = value;
    });
  }

  return {
    id: rowId,
    data,
    createdAt: (row.get("createdAt") as string) ?? new Date().toISOString(),
    updatedAt: (row.get("updatedAt") as string) ?? new Date().toISOString(),
  };
}

/**
 * Insert a new row
 */
export function insertRow(
  doc: Y.Doc,
  rowId: string,
  data: Record<string, unknown> = {},
): void {
  doc.transact(() => {
    const rowsMap = doc.getMap("rows");
    const rowOrder = doc.getArray<string>("rowOrder");

    const row = new Y.Map<unknown>();
    const rowData = new Y.Map<unknown>();

    Object.entries(data).forEach(([key, value]) => {
      rowData.set(key, value);
    });

    row.set("id", rowId);
    row.set("data", rowData);
    row.set("createdAt", new Date().toISOString());
    row.set("updatedAt", new Date().toISOString());

    rowsMap.set(rowId, row);
    rowOrder.push([rowId]);

    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Update a single cell value
 */
export function updateCell(
  doc: Y.Doc,
  rowId: string,
  columnId: string,
  value: unknown,
): void {
  doc.transact(() => {
    const rowsMap = doc.getMap("rows");
    const row = rowsMap.get(rowId) as Y.Map<unknown> | undefined;

    if (row) {
      const rowData = row.get("data") as Y.Map<unknown>;
      if (rowData) {
        rowData.set(columnId, value);
        row.set("updatedAt", new Date().toISOString());
      }
    }

    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Delete a row
 */
export function deleteRow(doc: Y.Doc, rowId: string): void {
  doc.transact(() => {
    const rowsMap = doc.getMap("rows");
    const rowOrder = doc.getArray<string>("rowOrder");

    rowsMap.delete(rowId);

    const index = rowOrder.toArray().indexOf(rowId);
    if (index !== -1) {
      rowOrder.delete(index, 1);
    }

    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Delete multiple rows
 */
export function deleteRows(doc: Y.Doc, rowIds: string[]): void {
  doc.transact(() => {
    const rowsMap = doc.getMap("rows");
    const rowOrder = doc.getArray<string>("rowOrder");

    for (const rowId of rowIds) {
      rowsMap.delete(rowId);

      const index = rowOrder.toArray().indexOf(rowId);
      if (index !== -1) {
        rowOrder.delete(index, 1);
      }
    }

    const meta = doc.getMap("meta");
    meta.set("updatedAt", new Date().toISOString());
  });
}

/**
 * Convert Y.Doc to a plain object for serialization
 */
export function docToPlainObject(doc: Y.Doc): {
  meta: { name: string; createdAt: string; updatedAt: string };
  columns: ColumnMeta[];
  rows: Array<{ id: string; data: Record<string, unknown>; createdAt: string; updatedAt: string }>;
} {
  return {
    meta: getTableMeta(doc),
    columns: getColumns(doc),
    rows: getRows(doc),
  };
}
