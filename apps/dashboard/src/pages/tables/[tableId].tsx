import { tablesService } from "@tables/sdk";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../components/tables/AddColumnModal";
import { ChatPanel } from "../../components/tables/ChatPanel";
import { TableGrid } from "../../components/tables/TableGrid";
import {
  useTableSocket,
  type TableEvent,
  type ConnectionStatus,
} from "../../hooks/useTableSocket";
import * as styles from "../../styles/tables.css";

/**
 * Column type definition
 */
type ColumnType = "text" | "number" | "boolean" | "date" | "select";

interface Column {
  id: string;
  name: string;
  dataType: ColumnType;
  position: number;
}

interface Row {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Table view page with real-time collaboration using WebSocket
 *
 * Uses REST API for initial data load and CRUD operations,
 * with WebSocket for real-time updates from other users.
 */
export default function TableViewPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Local state for table data
  const [tableName, setTableName] = useState("Untitled");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  // Handle incoming real-time events from other users
  const handleTableEvent = useCallback((event: TableEvent) => {
    switch (event.type) {
      case "CELL_UPDATED":
        setRows((prev) =>
          prev.map((row) =>
            row.id === event.rowId
              ? {
                  ...row,
                  data: { ...row.data, [event.columnId]: event.value },
                  updatedAt: new Date().toISOString(),
                }
              : row
          )
        );
        break;

      case "ROW_INSERTED":
        setRows((prev) => [
          ...prev,
          {
            id: event.rowId,
            data: event.data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
        break;

      case "ROW_DELETED":
        setRows((prev) => prev.filter((row) => row.id !== event.rowId));
        break;

      case "COLUMN_ADDED":
        setColumns((prev) => [
          ...prev,
          {
            id: event.columnId,
            name: event.name,
            dataType: event.dataType as ColumnType,
            position: event.position,
          },
        ]);
        break;

      case "COLUMN_RENAMED":
        setColumns((prev) =>
          prev.map((col) =>
            col.id === event.columnId ? { ...col, name: event.name } : col
          )
        );
        break;

      case "COLUMN_DELETED":
        setColumns((prev) => prev.filter((col) => col.id !== event.columnId));
        break;
    }
  }, []);

  // Handle successful row insert
  const handleRowInserted = useCallback(
    (
      clientSeq: number,
      msg: { rowId: string; row: Row }
    ) => {
      // Replace optimistic row with server-confirmed data
      setRows((prev) => {
        const existing = prev.find((r) => r.id === msg.rowId);
        if (existing) return prev;
        return [...prev, msg.row];
      });
    },
    []
  );

  // WebSocket connection for real-time updates
  const socket = useTableSocket({
    tableId: tableId ?? "",
    onEvent: handleTableEvent,
    onRowInserted: handleRowInserted,
    onError: (err) => {
      console.error("WebSocket error:", err);
    },
  });

  // Load initial table data via REST
  useEffect(() => {
    if (!tableId) return;

    const loadTable = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch table schema
        const tableResponse = await tablesService.getTable({
          path: { tableId },
        });

        if (tableResponse.error) {
          setError(tableResponse.error.error || "Failed to load table");
          return;
        }

        const tableData = tableResponse.data;
        setTableName(tableData.name);
        setColumns(tableData.columns);

        // Fetch rows
        const rowsResponse = await tablesService.listRows({
          path: { tableId },
          query: { limit: 100 },
        });

        if (rowsResponse.error) {
          setError(rowsResponse.error.error || "Failed to load rows");
          return;
        }

        setRows(rowsResponse.data.rows);
      } catch (err) {
        console.error("Failed to load table:", err);
        setError("Failed to connect to server");
      } finally {
        setIsLoading(false);
      }
    };

    loadTable();
  }, [tableId]);

  const handleAddRow = useCallback(async () => {
    if (!tableId) return;

    try {
      const response = await tablesService.insertRow({
        path: { tableId },
        body: { data: {} },
      });

      if (response.data) {
        setRows((prev) => [...prev, response.data]);
      }
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  }, [tableId]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!tableId) return;

      // Optimistic update
      const previousValue = rows.find((r) => r.id === rowId)?.data[columnId];
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                data: { ...row.data, [columnId]: value },
                updatedAt: new Date().toISOString(),
              }
            : row
        )
      );

      // Send via WebSocket
      socket.sendCellUpdate(rowId, columnId, value, () => {
        // Rollback on failure
        setRows((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  data: { ...row.data, [columnId]: previousValue },
                }
              : row
          )
        );
      });
    },
    [tableId, rows, socket]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!tableId) return;

      // Optimistic update
      const deletedRow = rows.find((r) => r.id === rowId);
      setRows((prev) => prev.filter((row) => row.id !== rowId));

      // Send via WebSocket
      socket.sendRowDelete(rowId, () => {
        // Rollback on failure
        if (deletedRow) {
          setRows((prev) => [...prev, deletedRow]);
        }
      });
    },
    [tableId, rows, socket]
  );

  const handleAddColumn = useCallback(
    async (name: string, dataType: ColumnType) => {
      if (!tableId) return;

      try {
        const response = await tablesService.addColumn({
          path: { tableId },
          body: { name, dataType },
        });

        if (response.data) {
          setColumns((prev) => [...prev, response.data]);
        }
        setIsAddingColumn(false);
      } catch (err) {
        console.error("Failed to add column:", err);
      }
    },
    [tableId]
  );

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      if (!tableId) return;

      try {
        await tablesService.deleteColumn({
          path: { tableId, columnId },
        });

        setColumns((prev) => prev.filter((col) => col.id !== columnId));
      } catch (err) {
        console.error("Failed to delete column:", err);
      }
    },
    [tableId]
  );

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

  // Derive connection status for UI
  const isConnected = socket.status === "connected";
  const isConnecting = socket.status === "connecting";

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Error</span>
        </header>
        <div className={styles.container}>
          <div className={styles.error}>
            {error}
            <br />
            <small style={{ opacity: 0.7, marginTop: "8px", display: "block" }}>
              Make sure the tables service is running (pnpm --filter @tables/service dev)
            </small>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>{tableName}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Connection status indicator */}
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isConnected
                ? "#22c55e"
                : isConnecting
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
            columns={columns}
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
            tableName={tableName}
            columns={columns}
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
