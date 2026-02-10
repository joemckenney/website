import { tablesService } from "@tables/sdk";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../components/tables/AddColumnModal";
import { ChatPanel } from "../../components/tables/ChatPanel";
import { TableGrid } from "../../components/tables/TableGrid";
import { useTableSocket, type TableEvent } from "../../hooks/useTableSocket";
import { ensureValidToken } from "../../lib/auth";
import * as styles from "../../styles/tables.css";

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

interface TableItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface BaseWithTables {
  id: string;
  userId: string;
  name: string;
  tables: TableItem[];
  createdAt: string;
  updatedAt: string;
}

export default function BaseDetailPage() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();

  // Base state
  const [base, setBase] = useState<BaseWithTables | null>(null);
  const [baseName, setBaseName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Selected table state
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Handle incoming real-time events
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
              : row,
          ),
        );
        break;

      case "ROW_INSERTED":
        setRows((prev) => {
          if (prev.some((row) => row.id === event.rowId)) return prev;
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
        setColumns((prev) => {
          if (prev.some((col) => col.id === event.columnId)) return prev;
          return [
            ...prev,
            {
              id: event.columnId,
              name: event.name,
              dataType: event.dataType as ColumnType,
              position: event.position,
            },
          ];
        });
        break;

      case "COLUMN_RENAMED":
        setColumns((prev) =>
          prev.map((col) =>
            col.id === event.columnId ? { ...col, name: event.name } : col,
          ),
        );
        break;

      case "COLUMN_DELETED":
        setColumns((prev) => prev.filter((col) => col.id !== event.columnId));
        break;
    }
  }, []);

  const handleRowInserted = useCallback(
    (_clientSeq: number, msg: { rowId: string; row: Row }) => {
      setRows((prev) => {
        const existing = prev.find((r) => r.id === msg.rowId);
        if (existing) return prev;
        return [...prev, msg.row];
      });
    },
    [],
  );

  // WebSocket connection for real-time updates
  const socket = useTableSocket({
    tableId: selectedTableId ?? "",
    onEvent: handleTableEvent,
    onRowInserted: handleRowInserted,
    onError: (err) => {
      console.error("WebSocket error:", err);
    },
  });

  // Load base data
  useEffect(() => {
    if (!baseId) return;

    const loadBase = async () => {
      const token = await ensureValidToken();
      if (!token) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await tablesService.getBase({
          path: { baseId },
        });

        if (response.error || !response.data) {
          setError("Failed to load base");
          return;
        }

        setBase(response.data);
        setBaseName(response.data.name);

        // Auto-select first table if exists
        if (response.data.tables.length > 0) {
          setSelectedTableId(response.data.tables[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load base");
      } finally {
        setIsLoading(false);
      }
    };

    loadBase();
  }, [baseId]);

  // Load selected table data
  useEffect(() => {
    if (!selectedTableId) {
      setColumns([]);
      setRows([]);
      return;
    }

    const loadTable = async () => {
      try {
        setIsTableLoading(true);

        const tableResponse = await tablesService.getTable({
          path: { tableId: selectedTableId },
        });

        if (tableResponse.error || !tableResponse.data) {
          setError("Failed to load table");
          return;
        }

        setColumns(tableResponse.data.columns);

        const rowsResponse = await tablesService.listRows({
          path: { tableId: selectedTableId },
          query: { limit: 100 },
        });

        if (rowsResponse.error || !rowsResponse.data) {
          setError("Failed to load rows");
          return;
        }

        setRows(rowsResponse.data.rows);
      } catch (err) {
        console.error("Failed to load table:", err);
        setError("Failed to connect to server");
      } finally {
        setIsTableLoading(false);
      }
    };

    loadTable();
  }, [selectedTableId]);

  const handleUpdateBaseName = async () => {
    if (!baseId || !baseName.trim()) return;

    try {
      await tablesService.updateBase({
        path: { baseId },
        body: { name: baseName.trim() },
      });
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to rename base:", err);
    }
  };

  const handleAddTable = async () => {
    if (!baseId || !newTableName.trim()) return;

    try {
      const response = await tablesService.createTable({
        body: {
          baseId,
          name: newTableName.trim(),
          columns: [{ name: "Name", dataType: "text" }],
        },
      });

      if (response.error || !response.data) {
        setError("Failed to create table");
        return;
      }

      // Add to base tables and select it
      setBase((prev) =>
        prev
          ? {
              ...prev,
              tables: [
                ...prev.tables,
                {
                  id: response.data.id,
                  name: response.data.name,
                  createdAt: response.data.createdAt,
                  updatedAt: response.data.updatedAt,
                },
              ],
            }
          : null,
      );
      setSelectedTableId(response.data.id);
      setNewTableName("");
      setIsAddingTable(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create table");
    }
  };

  const handleDeleteBase = async () => {
    if (!baseId) return;

    if (
      !confirm("Are you sure you want to delete this base and all its tables?")
    ) {
      return;
    }

    try {
      await tablesService.deleteBase({
        path: { baseId },
      });
      navigate("/bases");
    } catch (err) {
      console.error("Failed to delete base:", err);
    }
  };

  const handleAddRow = useCallback(async () => {
    if (!selectedTableId) return;

    try {
      await tablesService.insertRow({
        path: { tableId: selectedTableId },
        body: { data: {} },
      });
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  }, [selectedTableId]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!selectedTableId) return;

      const previousValue = rows.find((r) => r.id === rowId)?.data[columnId];
      setRows((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                data: { ...row.data, [columnId]: value },
                updatedAt: new Date().toISOString(),
              }
            : row,
        ),
      );

      socket.sendCellUpdate(rowId, columnId, value, () => {
        setRows((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? {
                  ...row,
                  data: { ...row.data, [columnId]: previousValue },
                }
              : row,
          ),
        );
      });
    },
    [selectedTableId, rows, socket],
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!selectedTableId) return;

      const deletedRow = rows.find((r) => r.id === rowId);
      setRows((prev) => prev.filter((row) => row.id !== rowId));

      socket.sendRowDelete(rowId, () => {
        if (deletedRow) {
          setRows((prev) => [...prev, deletedRow]);
        }
      });
    },
    [selectedTableId, rows, socket],
  );

  const handleAddColumn = useCallback(
    async (name: string, dataType: ColumnType) => {
      if (!selectedTableId) return;

      try {
        await tablesService.addColumn({
          path: { tableId: selectedTableId },
          body: { name, dataType },
        });
        setIsAddingColumn(false);
      } catch (err) {
        console.error("Failed to add column:", err);
      }
    },
    [selectedTableId],
  );

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      if (!selectedTableId) return;

      try {
        await tablesService.deleteColumn({
          path: { tableId: selectedTableId, columnId },
        });
        setColumns((prev) => prev.filter((col) => col.id !== columnId));
      } catch (err) {
        console.error("Failed to delete column:", err);
      }
    },
    [selectedTableId],
  );

  const isConnected = socket.status === "connected";
  const isConnecting = socket.status === "connecting";
  const selectedTable = base?.tables.find((t) => t.id === selectedTableId);

  if (isLoading) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Loading...</span>
        </header>
        <div className={styles.container}>
          <div className={styles.loading}>Loading base...</div>
        </div>
      </>
    );
  }

  if (error || !base) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Error</span>
        </header>
        <div className={styles.container}>
          <div className={styles.error}>{error || "Base not found"}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.header}>
        {isEditingName ? (
          <input
            type="text"
            className={styles.baseNameInput}
            value={baseName}
            onChange={(e) => setBaseName(e.target.value)}
            onBlur={handleUpdateBaseName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdateBaseName();
              if (e.key === "Escape") {
                setBaseName(base.name);
                setIsEditingName(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            type="button"
            className={styles.title}
            onClick={() => setIsEditingName(true)}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            {base.name}
          </button>
        )}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {selectedTableId && (
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
          )}
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleDeleteBase}
          >
            Delete Base
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {base.tables.map((table) => (
          <button
            key={table.id}
            type="button"
            className={styles.tab}
            data-active={table.id === selectedTableId}
            onClick={() => setSelectedTableId(table.id)}
          >
            {table.name}
          </button>
        ))}
        <button
          type="button"
          className={styles.addTabButton}
          onClick={() => setIsAddingTable(true)}
          title="Add new table"
        >
          +
        </button>
      </div>

      {base.tables.length === 0 ? (
        <div className={styles.container}>
          <div className={styles.empty}>
            <p>No tables in this base yet.</p>
            <button
              type="button"
              className={styles.emptyLink}
              onClick={() => setIsAddingTable(true)}
            >
              Create your first table
            </button>
          </div>
        </div>
      ) : isTableLoading ? (
        <div className={styles.container}>
          <div className={styles.loading}>Loading table...</div>
        </div>
      ) : (
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

          {isChatOpen && selectedTableId && (
            <ChatPanel
              tableId={selectedTableId}
              tableName={selectedTable?.name ?? ""}
              columns={columns}
              onClose={() => setIsChatOpen(false)}
            />
          )}
        </div>
      )}

      {isAddingColumn && (
        <AddColumnModal
          onClose={() => setIsAddingColumn(false)}
          onAdd={handleAddColumn}
        />
      )}

      {/* Add Table Modal */}
      {isAddingTable && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsAddingTable(false)}
          onKeyDown={(e) => e.key === "Escape" && setIsAddingTable(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
          >
            <h2 className={styles.modalTitle}>Add New Table</h2>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="tableName">
                Table Name
              </label>
              <input
                id="tableName"
                type="text"
                className={styles.formInput}
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g., Tasks, Contacts"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddTable();
                  }
                }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButtonSecondary}
                onClick={() => setIsAddingTable(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalButtonPrimary}
                onClick={handleAddTable}
                disabled={!newTableName.trim()}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
