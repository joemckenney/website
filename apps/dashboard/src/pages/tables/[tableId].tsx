import { tablesService } from "@tables/sdk";
import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../components/tables/AddColumnModal";
import { ChatPanel } from "../../components/tables/ChatPanel";
import { TableGrid } from "../../components/tables/TableGrid";
import { useYjsTable, type Column } from "../../hooks/useYjsTable";
import * as styles from "../../styles/tables.css";

/**
 * Table view page with real-time collaboration using Yjs CRDTs
 *
 * With Yjs, state is automatically synchronized across all clients.
 * No need for manual optimistic updates or event handling - Yjs handles
 * conflict resolution and state merging automatically.
 */
export default function TableViewPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use Yjs for real-time collaborative editing
  const yjs = useYjsTable({
    tableId: tableId ?? "",
    onError: (err) => setError(err.message),
  });

  const handleAddRow = useCallback(() => {
    if (!tableId || yjs.status !== "connected") return;
    yjs.insertRow({});
  }, [tableId, yjs]);

  const handleCellUpdate = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (!tableId) return;
      yjs.updateCell(rowId, columnId, value);
    },
    [tableId, yjs]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!tableId) return;
      yjs.deleteRow(rowId);
    },
    [tableId, yjs]
  );

  const handleAddColumn = useCallback(
    (name: string, dataType: Column["dataType"]) => {
      if (!tableId) return;

      const columnId = crypto.randomUUID();
      yjs.addColumn({
        id: columnId,
        name,
        dataType,
      });
      setIsAddingColumn(false);
    },
    [tableId, yjs]
  );

  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (!tableId) return;
      yjs.deleteColumn(columnId);
    },
    [tableId, yjs]
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

  // Show loading state while connecting
  if (yjs.status === "connecting" && !yjs.synced) {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Loading...</span>
        </header>
        <div className={styles.container}>
          <div className={styles.loading}>Connecting to table...</div>
        </div>
      </>
    );
  }

  // Show error state
  if (error || yjs.status === "error") {
    return (
      <>
        <header className={styles.header}>
          <span className={styles.title}>Error</span>
        </header>
        <div className={styles.container}>
          <div className={styles.error}>
            {error || "Failed to connect to table"}
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
        <span className={styles.title}>{yjs.tableName}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Connection status indicator */}
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor:
                yjs.status === "connected" && yjs.synced
                  ? "#22c55e"
                  : yjs.status === "connecting"
                    ? "#eab308"
                    : "#ef4444",
            }}
            title={`Yjs: ${yjs.status}${yjs.synced ? " (synced)" : ""}`}
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
            columns={yjs.columns}
            rows={yjs.rows}
            onCellUpdate={handleCellUpdate}
            onAddRow={handleAddRow}
            onDeleteRow={handleDeleteRow}
            onDeleteColumn={handleDeleteColumn}
          />
        </div>

        {isChatOpen && (
          <ChatPanel
            tableId={tableId ?? ""}
            tableName={yjs.tableName}
            columns={yjs.columns}
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
