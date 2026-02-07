import { tablesService } from "@tables/sdk";
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { AddColumnModal } from "../../components/tables/AddColumnModal";
import { TableGrid } from "../../components/tables/TableGrid";
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

  const handleAddRow = async () => {
    if (!tableId || !table) return;

    try {
      const response = await tablesService.insertRow({
        path: { tableId },
        body: { data: {} },
      });

      if (response.data) {
        setRows((prev) => [...prev, response.data as Row]);
      }
    } catch (err) {
      console.error("Failed to add row:", err);
    }
  };

  const handleCellUpdate = async (
    rowId: string,
    columnId: string,
    value: unknown,
  ) => {
    if (!tableId) return;

    // Optimistic update
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, data: { ...row.data, [columnId]: value } }
          : row,
      ),
    );

    try {
      await tablesService.updateRow({
        path: { tableId, rowId },
        body: { data: { [columnId]: value } },
      });
    } catch (err) {
      console.error("Failed to update cell:", err);
      // Revert on error
      loadTable();
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    if (!tableId) return;

    // Optimistic update
    setRows((prev) => prev.filter((row) => row.id !== rowId));

    try {
      await tablesService.deleteRow({
        path: { tableId, rowId },
      });
    } catch (err) {
      console.error("Failed to delete row:", err);
      // Revert on error
      loadTable();
    }
  };

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
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={handleDeleteTable}
          >
            Delete
          </button>
        </div>
      </header>

      <div className={styles.tableContainer}>
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

      {isAddingColumn && (
        <AddColumnModal
          onClose={() => setIsAddingColumn(false)}
          onAdd={handleAddColumn}
        />
      )}
    </>
  );
}
