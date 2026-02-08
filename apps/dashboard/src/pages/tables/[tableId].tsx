import { tablesService } from "@tables/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../components/tables/AddColumnModal";
import { ChatPanel } from "../../components/tables/ChatPanel";
import { TableGrid } from "../../components/tables/TableGrid";
import { useDebouncedCellUpdate } from "../../hooks/useDebouncedCellUpdate";
import { useTableSocket, type TableEvent } from "../../hooks/useTableSocket";
import { ensureValidToken } from "../../lib/auth";
import * as styles from "../../styles/tables.css";

interface Column {
  id: string;
  name: string;
  dataType: "text" | "number" | "boolean" | "date" | "select";
  position: number;
}

interface Row {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface TableData {
  id: string;
  name: string;
  columns: Column[];
  createdAt: string;
  updatedAt: string;
}

export default function TableViewPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [table, setTable] = useState<TableData | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Store previous row values for rollback
  const previousRowValues = useRef<Map<string, Map<string, unknown>>>(
    new Map(),
  );

  // Handle real-time events from other users
  const handleEvent = useCallback((event: TableEvent) => {
    switch (event.type) {
      case "CELL_UPDATED":
        setRows((prev) =>
          prev.map((row) =>
            row.id === event.rowId
              ? { ...row, data: { ...row.data, [event.columnId]: event.value } }
              : row,
          ),
        );
        break;

      case "ROW_INSERTED":
        // Add the new row if it doesn't exist
        setRows((prev) => {
          if (prev.some((r) => r.id === event.rowId)) return prev;
          return [
            ...prev,
            {
              id: event.rowId,
              data: event.data,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ];
        });
        break;

      case "ROW_DELETED":
        setRows((prev) => prev.filter((row) => row.id !== event.rowId));
        break;

      case "COLUMN_ADDED":
        setTable((prev) => {
          if (!prev) return prev;
          if (prev.columns.some((c) => c.id === event.columnId)) return prev;
          return {
            ...prev,
            columns: [
              ...prev.columns,
              {
                id: event.columnId,
                name: event.name,
                dataType: event.dataType as Column["dataType"],
                position: event.position,
              },
            ],
          };
        });
        break;

      case "COLUMN_RENAMED":
        setTable((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.map((col) =>
              col.id === event.columnId ? { ...col, name: event.name } : col,
            ),
          };
        });
        break;

      case "COLUMN_DELETED":
        setTable((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            columns: prev.columns.filter((col) => col.id !== event.columnId),
          };
        });
        break;
    }
  }, []);

  // Handle row insert success (we need the server-assigned row data)
  const handleRowInserted = useCallback(
    (_clientSeq: number, msg: { rowId: string; row: Row }) => {
      // Replace the optimistic row with the server-confirmed one
      setRows((prev) => {
        // Check if we already have a row with a temp ID that matches
        // For now, just add the row if it doesn't exist
        if (prev.some((r) => r.id === msg.rowId)) {
          return prev.map((r) => (r.id === msg.rowId ? msg.row : r));
        }
        return [...prev, msg.row];
      });
    },
    [],
  );

  // Handle errors from WebSocket
  const handleSocketError = useCallback(
    (error: { code: string; message: string }) => {
      console.error("WebSocket error:", error);
      // Could show a toast notification here
    },
    [],
  );

  // WebSocket connection (only when we have a tableId)
  const socket = useTableSocket({
    tableId: tableId ?? "",
    onEvent: handleEvent,
    onRowInserted: handleRowInserted,
    onError: handleSocketError,
    autoReconnect: true,
  });

  // Debounced cell updates
  const { updateCell, flush } = useDebouncedCellUpdate({
    sendCellUpdate: socket.sendCellUpdate,
    debounceMs: 300,
  });

  const loadTable = useCallback(async () => {
    if (!tableId) return;

    const token = await ensureValidToken();
    if (!token) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const [tableResponse, rowsResponse] = await Promise.all([
        tablesService.getTable({ path: { tableId } }),
        tablesService.listRows({ path: { tableId }, query: { limit: 100 } }),
      ]);

      if (tableResponse.error || !tableResponse.data) {
        setError("Table not found");
        setIsLoading(false);
        return;
      }

      setTable(tableResponse.data);

      if (rowsResponse.data) {
        setRows(rowsResponse.data.rows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load table");
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  // Flush pending updates when unmounting or navigating away
  useEffect(() => {
    return () => {
      flush();
    };
  }, [flush]);

  const handleAddRow = useCallback(() => {
    if (!tableId || !table) return;

    // Send via WebSocket for real-time sync
    socket.sendRowInsert({});
  }, [tableId, table, socket]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!tableId) return;

      // Store previous value for rollback
      const row = rows.find((r) => r.id === rowId);
      if (row) {
        if (!previousRowValues.current.has(rowId)) {
          previousRowValues.current.set(rowId, new Map());
        }
        const rowPrevValues = previousRowValues.current.get(rowId)!;
        if (!rowPrevValues.has(columnId)) {
          rowPrevValues.set(columnId, row.data[columnId]);
        }
      }

      // Optimistic update
      setRows((prev) =>
        prev.map((r) =>
          r.id === rowId ? { ...r, data: { ...r.data, [columnId]: value } } : r,
        ),
      );

      // Create rollback function
      const rollback = () => {
        const prevValue = previousRowValues.current.get(rowId)?.get(columnId);
        setRows((prev) =>
          prev.map((r) =>
            r.id === rowId
              ? { ...r, data: { ...r.data, [columnId]: prevValue } }
              : r,
          ),
        );
        previousRowValues.current.get(rowId)?.delete(columnId);
      };

      // Send via debounced WebSocket
      updateCell(rowId, columnId, value, rollback);

      // Clear stored previous value on success (after debounce completes)
      // This happens automatically when the ACK is received
    },
    [tableId, rows, updateCell],
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!tableId) return;

      // Store the row for rollback
      const deletedRow = rows.find((r) => r.id === rowId);

      // Optimistic update
      setRows((prev) => prev.filter((row) => row.id !== rowId));

      // Create rollback function
      const rollback = () => {
        if (deletedRow) {
          setRows((prev) => [...prev, deletedRow]);
        }
      };

      // Send via WebSocket
      socket.sendRowDelete(rowId, rollback);
    },
    [tableId, rows, socket],
  );

  const handleAddColumn = async (
    name: string,
    dataType: Column["dataType"],
  ) => {
    if (!tableId) return;

    try {
      const response = await tablesService.addColumn({
        path: { tableId },
        body: { name, dataType },
      });

      if (response.data && table) {
        setTable({
          ...table,
          columns: [...table.columns, response.data],
        });
      }
      setIsAddingColumn(false);
    } catch (err) {
      console.error("Failed to add column:", err);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!tableId || !table) return;

    // Optimistic update
    setTable({
      ...table,
      columns: table.columns.filter((col) => col.id !== columnId),
    });

    try {
      await tablesService.deleteColumn({
        path: { tableId, columnId },
      });
    } catch (err) {
      console.error("Failed to delete column:", err);
      loadTable();
    }
  };

  const handleDeleteTable = async () => {
    if (!tableId) return;

    if (!confirm("Are you sure you want to delete this table?")) {
      return;
    }

    try {
      await tablesService.deleteTable({
        path: { tableId },
      });
      navigate("/tables");
    } catch (err) {
      console.error("Failed to delete table:", err);
    }
  };

  if (isLoading) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Loading...</span>
        </header>
        <div className={styles.container}>
          <div className={styles.loading}>Loading table...</div>
        </div>
      </>
    );
  }

  if (error || !table) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Error</span>
        </header>
        <div className={styles.container}>
          <div className={styles.error}>{error || "Table not found"}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>{table.name}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Connection status indicator */}
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                socket.status === "connected"
                  ? "#22c55e"
                  : socket.status === "connecting"
                    ? "#eab308"
                    : "#ef4444",
            }}
            title={`WebSocket: ${socket.status}`}
          />
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleDeleteTable}
          >
            Delete
          </button>
        </div>
      </header>

      <div className={styles.splitPane}>
        <div className={styles.tablePane}>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => setIsAddingColumn(true)}
            >
              + Add Column
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={handleAddRow}
            >
              + Add Row
            </button>
            <button
              type="button"
              className={styles.chatToggleBtn}
              data-active={isChatOpen}
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              AI
            </button>
          </div>

          <TableGrid
            columns={table.columns}
            rows={rows}
            onCellUpdate={handleCellUpdate}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onDeleteColumn={handleDeleteColumn}
          />
        </div>

        {isChatOpen && (
          <ChatPanel
            tableId={tableId ?? ""}
            tableName={table.name}
            columns={table.columns}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>

      {isAddingColumn && (
        <AddColumnModal
          onClose={() => setIsAddingColumn(false)}
          onAdd={handleAddColumn}
        />
      )}
    </>
  );
}
