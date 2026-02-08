import { HocuspocusProvider } from "@hocuspocus/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { ensureValidToken } from "../lib/auth";

// Connection configuration
const CONNECTION_TIMEOUT_MS = 5000;

export type ColumnType = "text" | "number" | "boolean" | "date" | "select";

export interface Column {
  id: string;
  name: string;
  dataType: ColumnType;
  position: number;
  options?: string[];
}

export interface Row {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseYjsTableOptions {
  tableId: string;
  onError?: (error: Error) => void;
}

export interface UseYjsTableReturn {
  /** Connection status */
  status: ConnectionStatus;
  /** Whether initial sync is complete */
  synced: boolean;
  /** Table name */
  tableName: string;
  /** Columns sorted by position */
  columns: Column[];
  /** All rows */
  rows: Row[];
  /** Update a cell value */
  updateCell: (rowId: string, columnId: string, value: unknown) => void;
  /** Insert a new row */
  insertRow: (data?: Record<string, unknown>) => string;
  /** Delete a row */
  deleteRow: (rowId: string) => void;
  /** Delete multiple rows */
  deleteRows: (rowIds: string[]) => void;
  /** Add a new column */
  addColumn: (column: Omit<Column, "position">) => void;
  /** Rename a column */
  renameColumn: (columnId: string, name: string) => void;
  /** Delete a column */
  deleteColumn: (columnId: string) => void;
  /** Update table name */
  updateTableName: (name: string) => void;
  /** Raw Y.Doc (for advanced use) */
  doc: Y.Doc;
  /** Provider instance (for awareness, etc.) */
  provider: HocuspocusProvider | null;
}

/**
 * Extract columns from Y.Doc
 */
function extractColumns(doc: Y.Doc): Column[] {
  const columnsMap = doc.getMap("columns");
  const result: Column[] = [];

  columnsMap.forEach((value, key) => {
    const col = value as Column;
    result.push({
      id: key,
      name: col.name,
      dataType: col.dataType,
      position: col.position,
      options: col.options,
    });
  });

  return result.sort((a, b) => a.position - b.position);
}

/**
 * Extract rows from Y.Doc
 */
function extractRows(doc: Y.Doc): Row[] {
  const rowsMap = doc.getMap("rows");
  const rowOrder = doc.getArray<string>("rowOrder");
  const orderedIds = rowOrder.toArray();
  const result: Row[] = [];

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

      result.push({
        id: rowId,
        data,
        createdAt: (row.get("createdAt") as string) ?? new Date().toISOString(),
        updatedAt: (row.get("updatedAt") as string) ?? new Date().toISOString(),
      });
    }
  }

  return result;
}

/**
 * Hook for real-time collaborative table editing using Yjs
 */
export function useYjsTable(options: UseYjsTableOptions): UseYjsTableReturn {
  const { tableId, onError } = options;

  // Stable Y.Doc reference per tableId
  const docRef = useRef<{ id: string; doc: Y.Doc } | null>(null);
  if (!docRef.current || docRef.current.id !== tableId) {
    docRef.current = { id: tableId, doc: new Y.Doc() };
  }
  const doc = docRef.current.doc;

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [synced, setSynced] = useState(false);

  // Reactive state from Y.Doc
  const [tableName, setTableName] = useState("Untitled");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  // Track if we should observe (only after first sync)
  const shouldObserveRef = useRef(false);
  // Track if we've given up on connecting (to prevent HocuspocusProvider's internal reconnection)
  const gaveUpRef = useRef(false);
  // Stable ref for onError to avoid effect re-runs when callback changes
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Update state from Y.Doc
  const updateFromDoc = useCallback(() => {
    const meta = doc.getMap("meta");
    setTableName((meta.get("name") as string) ?? "Untitled");
    setColumns(extractColumns(doc));
    setRows(extractRows(doc));
  }, [doc]);

  // Connect to Hocuspocus server
  useEffect(() => {
    if (!tableId) return;

    let mounted = true;
    let providerInstance: HocuspocusProvider | null = null;
    let connectionTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let hasConnectedOnce = false;

    // Reset gave up flag for new connection attempt
    gaveUpRef.current = false;

    const connect = async () => {
      // Don't attempt to connect if we've already given up
      if (gaveUpRef.current) return;
      try {
        const token = await ensureValidToken();
        if (!token || !mounted || gaveUpRef.current) return;

        // Determine WebSocket URL - connect directly to Yjs server
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3005";
        // Yjs runs on port 3006
        const wsUrl = apiUrl
          .replace(/^http/, "ws")
          .replace(/:3005/, ":3006")
          .replace(/:3000/, ":3006");

        console.log("[useYjsTable] Connecting to", wsUrl, "for table:", tableId);

        // Set a timeout for the initial connection
        connectionTimeoutId = setTimeout(() => {
          if (mounted && !hasConnectedOnce && !gaveUpRef.current) {
            console.warn("[useYjsTable] Connection timeout, Yjs server may not be running");
            gaveUpRef.current = true;
            setStatus("error");
            onErrorRef.current?.(new Error("Connection timeout - Yjs server may not be running on port 3006"));
            if (providerInstance) {
              providerInstance.destroy();
              providerInstance = null;
            }
          }
        }, CONNECTION_TIMEOUT_MS);

        providerInstance = new HocuspocusProvider({
          url: wsUrl,
          name: `table:${tableId}`,
          document: doc,
          token,
          onConnect: () => {
            console.log("[useYjsTable] onConnect fired");
            if (mounted && !gaveUpRef.current) {
              hasConnectedOnce = true;
              if (connectionTimeoutId) {
                clearTimeout(connectionTimeoutId);
                connectionTimeoutId = null;
              }
              setStatus("connected");
            }
          },
          onSynced: () => {
            console.log("[useYjsTable] onSynced fired");
            if (mounted && !gaveUpRef.current) {
              if (connectionTimeoutId) {
                clearTimeout(connectionTimeoutId);
                connectionTimeoutId = null;
              }
              setSynced(true);
              shouldObserveRef.current = true;
              // Load initial data after sync
              updateFromDoc();
            }
          },
          onClose: () => {
            console.log("[useYjsTable] onClose fired, gaveUp:", gaveUpRef.current, "hasConnectedOnce:", hasConnectedOnce);
            // If we've already given up, ignore further close events
            if (gaveUpRef.current) return;

            // If we never connected successfully, this is a connection failure
            if (!hasConnectedOnce && mounted) {
              gaveUpRef.current = true;
              setStatus("error");
              onErrorRef.current?.(new Error("Failed to connect to Yjs server"));
              if (providerInstance) {
                providerInstance.destroy();
                providerInstance = null;
              }
            } else if (mounted) {
              // We were connected but got disconnected - allow reconnection
              setStatus("disconnected");
            }
          },
          onDisconnect: () => {
            console.log("[useYjsTable] onDisconnect fired");
            if (mounted && !gaveUpRef.current) {
              setStatus("disconnected");
            }
          },
          onAuthenticationFailed: (data) => {
            console.log("[useYjsTable] onAuthenticationFailed:", data);
            if (mounted && !gaveUpRef.current) {
              gaveUpRef.current = true;
              if (connectionTimeoutId) {
                clearTimeout(connectionTimeoutId);
                connectionTimeoutId = null;
              }
              setStatus("error");
              onErrorRef.current?.(new Error("Authentication failed"));
              if (providerInstance) {
                providerInstance.destroy();
                providerInstance = null;
              }
            }
          },
        });

        if (mounted && !gaveUpRef.current) {
          setProvider(providerInstance);
        }
      } catch (err) {
        if (mounted && !gaveUpRef.current) {
          gaveUpRef.current = true;
          setStatus("error");
          onErrorRef.current?.(err instanceof Error ? err : new Error("Connection failed"));
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      gaveUpRef.current = true;
      shouldObserveRef.current = false;
      if (connectionTimeoutId) {
        clearTimeout(connectionTimeoutId);
      }
      if (providerInstance) {
        providerInstance.destroy();
      }
    };
  }, [tableId, doc, updateFromDoc]);

  // Subscribe to Y.Doc changes only after initial sync
  useEffect(() => {
    if (!synced) return;

    const meta = doc.getMap("meta");
    const columnsMap = doc.getMap("columns");
    const rowsMap = doc.getMap("rows");
    const rowOrder = doc.getArray<string>("rowOrder");

    const handleMetaChange = () => {
      if (shouldObserveRef.current) {
        setTableName((meta.get("name") as string) ?? "Untitled");
      }
    };

    const handleColumnsChange = () => {
      if (shouldObserveRef.current) {
        setColumns(extractColumns(doc));
      }
    };

    const handleRowsChange = () => {
      if (shouldObserveRef.current) {
        setRows(extractRows(doc));
      }
    };

    meta.observe(handleMetaChange);
    columnsMap.observeDeep(handleColumnsChange);
    rowsMap.observeDeep(handleRowsChange);
    rowOrder.observe(handleRowsChange);

    return () => {
      meta.unobserve(handleMetaChange);
      columnsMap.unobserveDeep(handleColumnsChange);
      rowsMap.unobserveDeep(handleRowsChange);
      rowOrder.unobserve(handleRowsChange);
    };
  }, [doc, synced]);

  // Mutation functions
  const updateCell = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
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
    },
    [doc]
  );

  const insertRow = useCallback(
    (data: Record<string, unknown> = {}): string => {
      const rowId = crypto.randomUUID();

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

      return rowId;
    },
    [doc]
  );

  const deleteRow = useCallback(
    (rowId: string) => {
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
    },
    [doc]
  );

  const deleteRowsAction = useCallback(
    (rowIds: string[]) => {
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
    },
    [doc]
  );

  const addColumn = useCallback(
    (column: Omit<Column, "position">) => {
      doc.transact(() => {
        const columnsMap = doc.getMap("columns");
        const columnOrder = doc.getArray<string>("columnOrder");

        const position = columnOrder.length;
        const columnData: Column = {
          ...column,
          position,
        };

        columnsMap.set(column.id, columnData);
        columnOrder.push([column.id]);

        const meta = doc.getMap("meta");
        meta.set("updatedAt", new Date().toISOString());
      });
    },
    [doc]
  );

  const renameColumn = useCallback(
    (columnId: string, name: string) => {
      doc.transact(() => {
        const columnsMap = doc.getMap("columns");
        const existing = columnsMap.get(columnId) as Column | undefined;

        if (existing) {
          columnsMap.set(columnId, { ...existing, name });
          const meta = doc.getMap("meta");
          meta.set("updatedAt", new Date().toISOString());
        }
      });
    },
    [doc]
  );

  const deleteColumnAction = useCallback(
    (columnId: string) => {
      doc.transact(() => {
        const columnsMap = doc.getMap("columns");
        const columnOrder = doc.getArray<string>("columnOrder");

        columnsMap.delete(columnId);

        const index = columnOrder.toArray().indexOf(columnId);
        if (index !== -1) {
          columnOrder.delete(index, 1);
        }

        // Update remaining column positions
        const remaining = columnOrder.toArray();
        remaining.forEach((colId, idx) => {
          const col = columnsMap.get(colId) as Column | undefined;
          if (col && col.position !== idx) {
            columnsMap.set(colId, { ...col, position: idx });
          }
        });

        // Remove column data from all rows
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
    },
    [doc]
  );

  const updateTableNameAction = useCallback(
    (name: string) => {
      doc.transact(() => {
        const meta = doc.getMap("meta");
        meta.set("name", name);
        meta.set("updatedAt", new Date().toISOString());
      });
    },
    [doc]
  );

  return {
    status,
    synced,
    tableName,
    columns,
    rows,
    updateCell,
    insertRow,
    deleteRow,
    deleteRows: deleteRowsAction,
    addColumn,
    renameColumn,
    deleteColumn: deleteColumnAction,
    updateTableName: updateTableNameAction,
    doc,
    provider,
  };
}
