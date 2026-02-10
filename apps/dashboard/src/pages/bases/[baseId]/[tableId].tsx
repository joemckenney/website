import { tablesService } from "@tables/sdk";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../../components/tables/AddColumnModal";
import { AgentsDropdown } from "../../../components/tables/AgentsDropdown";
import { ChatPanel } from "../../../components/tables/ChatPanel";
import { TableGrid } from "../../../components/tables/TableGrid";
import { useBaseContext } from "../../../contexts/base-context";
import { useTableSocket, type TableEvent } from "../../../hooks/useTableSocket";
import { ensureValidToken } from "../../../lib/auth";
import * as layoutStyles from "../../../styles/layout.css";
import * as styles from "../../../styles/tables.css";

type ColumnType = "text" | "number" | "boolean" | "date" | "select" | "relation";

interface Column {
  id: string;
  name: string;
  dataType: ColumnType;
  position: number;
  referencedTableId?: string;
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
  const { baseId, tableId: selectedTableId } = useParams<{ baseId: string; tableId: string }>();
  const navigate = useNavigate();
  const { setBaseName } = useBaseContext();

  // Base state
  const [base, setBase] = useState<BaseWithTables | null>(null);
  const [localBaseName, setLocalBaseName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

  // Selected table state
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isAddingTable, setIsAddingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  const isEmptyBase = selectedTableId === "_empty";

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
              ...(event.referencedTableId ? { referencedTableId: event.referencedTableId } : {}),
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
    tableId: isEmptyBase ? "" : (selectedTableId ?? ""),
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
        setLocalBaseName(response.data.name);
        setBaseName(response.data.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load base");
      } finally {
        setIsLoading(false);
      }
    };

    loadBase();

    // Clear base name when leaving
    return () => {
      setBaseName(null);
    };
  }, [baseId, setBaseName]);

  // Load selected table data
  useEffect(() => {
    if (!selectedTableId || isEmptyBase) {
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
  }, [selectedTableId, isEmptyBase]);

  const handleUpdateBaseName = async () => {
    if (!baseId || !localBaseName.trim()) return;

    try {
      await tablesService.updateBase({
        path: { baseId },
        body: { name: localBaseName.trim() },
      });
      setBaseName(localBaseName.trim());
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
      setNewTableName("");
      setIsAddingTable(false);
      navigate(`/bases/${baseId}/${response.data.id}`);
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
    if (!selectedTableId || isEmptyBase) return;

    try {
      await tablesService.insertRow({
        path: { tableId: selectedTableId },
        body: { data: {} },
      });
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  }, [selectedTableId, isEmptyBase]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!selectedTableId || isEmptyBase) return;

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
    [selectedTableId, isEmptyBase, rows, socket],
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!selectedTableId || isEmptyBase) return;

      const deletedRow = rows.find((r) => r.id === rowId);
      setRows((prev) => prev.filter((row) => row.id !== rowId));

      socket.sendRowDelete(rowId, () => {
        if (deletedRow) {
          setRows((prev) => [...prev, deletedRow]);
        }
      });
    },
    [selectedTableId, isEmptyBase, rows, socket],
  );

  const handleAddColumn = useCallback(
    async (name: string, dataType: ColumnType, referencedTableId?: string) => {
      if (!selectedTableId || isEmptyBase) return;

      try {
        await tablesService.addColumn({
          path: { tableId: selectedTableId },
          body: { name, dataType, ...(referencedTableId ? { referencedTableId } : {}) },
        });
        setIsAddingColumn(false);
      } catch (err) {
        console.error("Failed to add column:", err);
      }
    },
    [selectedTableId, isEmptyBase],
  );

  const handleDeleteColumn = useCallback(
    async (columnId: string) => {
      if (!selectedTableId || isEmptyBase) return;

      try {
        await tablesService.deleteColumn({
          path: { tableId: selectedTableId, columnId },
        });
        setColumns((prev) => prev.filter((col) => col.id !== columnId));
      } catch (err) {
        console.error("Failed to delete column:", err);
      }
    },
    [selectedTableId, isEmptyBase],
  );

  const isConnected = socket.status === "connected";
  const isConnecting = socket.status === "connecting";

  if (isLoading) {
    return <div className={layoutStyles.loadingContainer}>Loading...</div>;
  }

  if (error || !base) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error || "Base not found"}</div>
      </div>
    );
  }

  return (
    <div className={layoutStyles.baseLayout}>
      {/* Chat panel on left - associated with base */}
      <div className={layoutStyles.chatPane}>
        <ChatPanel
          tableId={isEmptyBase ? (baseId ?? "") : (selectedTableId ?? baseId ?? "")}
          tableName={base.name}
          columns={columns}
        />
      </div>

      {/* Content pane on right */}
      <div className={layoutStyles.contentPane}>
        {/* Header with base name */}
        <header className={styles.header}>
          {isEditingName ? (
            <input
              type="text"
              className={styles.baseNameInput}
              value={localBaseName}
              onChange={(e) => setLocalBaseName(e.target.value)}
              onBlur={handleUpdateBaseName}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdateBaseName();
                if (e.key === "Escape") {
                  setLocalBaseName(base.name);
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
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {base.name}
            </button>
          )}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {!isEmptyBase && selectedTableId && (
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
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
              Delete
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
              onClick={() => navigate(`/bases/${baseId}/${table.id}`)}
            >
              {table.name}
            </button>
          ))}
          <button
            type="button"
            className={styles.addTabButton}
            onClick={() => setIsAddingTable(true)}
            title="Add table"
          >
            +
          </button>
        </div>

        {isEmptyBase || base.tables.length === 0 ? (
          <div className={styles.container}>
            <div className={styles.empty}>
              <p>No tables yet.</p>
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
            <div className={styles.loading}>Loading...</div>
          </div>
        ) : (
          <div className={styles.tablePane}>
            <div className={styles.toolbar}>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => setIsAddingColumn(true)}
              >
                + Column
              </button>
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={handleAddRow}
              >
                + Row
              </button>
              {selectedTableId && (
                <AgentsDropdown
                  tableId={selectedTableId}
                  columns={columns}
                />
              )}
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
        )}
      </div>

      {isAddingColumn && (
        <AddColumnModal
          onClose={() => setIsAddingColumn(false)}
          onAdd={handleAddColumn}
          tables={base.tables}
          currentTableId={selectedTableId ?? undefined}
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
            <h2 className={styles.modalTitle}>Add Table</h2>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="tableName">
                Name
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
                  if (e.key === "Enter") handleAddTable();
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
    </div>
  );
}
