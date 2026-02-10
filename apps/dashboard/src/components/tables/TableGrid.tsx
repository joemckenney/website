import { useState, useCallback } from "react";
import * as styles from "../../styles/tables.css";
import { Cell } from "./Cell";

interface Column {
  id: string;
  name: string;
  dataType: "text" | "number" | "boolean" | "date" | "select" | "relation";
  position: number;
  referencedTableId?: string;
}

interface Row {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface TableGridProps {
  columns: Column[];
  rows: Row[];
  onCellUpdate: (rowId: string, columnId: string, value: unknown) => void;
  onAddRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function TableGrid({
  columns,
  rows,
  onCellUpdate,
  onAddRow,
  onDeleteRow,
  onDeleteColumn,
}: TableGridProps) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  const handleCellClick = useCallback(
    (rowId: string, columnId: string, dataType: string) => {
      // Boolean cells toggle on click, no edit mode needed
      if (dataType === "boolean") {
        return;
      }
      setEditingCell({ rowId, columnId });
    },
    [],
  );

  const handleCellBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, rowId: string, columnIndex: number) => {
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();

        // Move to next cell
        if (e.key === "Tab" && !e.shiftKey) {
          if (columnIndex < sortedColumns.length - 1) {
            setEditingCell({
              rowId,
              columnId: sortedColumns[columnIndex + 1].id,
            });
          } else {
            // Move to next row, first column
            const rowIndex = rows.findIndex((r) => r.id === rowId);
            if (rowIndex < rows.length - 1) {
              setEditingCell({
                rowId: rows[rowIndex + 1].id,
                columnId: sortedColumns[0].id,
              });
            } else {
              setEditingCell(null);
            }
          }
        } else if (e.key === "Tab" && e.shiftKey) {
          if (columnIndex > 0) {
            setEditingCell({
              rowId,
              columnId: sortedColumns[columnIndex - 1].id,
            });
          }
        } else if (e.key === "Enter") {
          setEditingCell(null);
        }
      } else if (e.key === "Escape") {
        setEditingCell(null);
      }
    },
    [sortedColumns, rows],
  );

  return (
    <div className={styles.gridWrapper}>
      <div className={styles.grid}>
        {/* Header */}
        <div className={styles.gridHeader}>
          <div className={styles.gridHeaderRow}>
            {sortedColumns.map((col) => (
              <div key={col.id} className={styles.gridHeaderCell}>
                <span>{col.name}</span>
                <button
                  type="button"
                  onClick={() => onDeleteColumn(col.id)}
                  style={{
                    marginLeft: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.5,
                    fontSize: "12px",
                  }}
                  title="Delete column"
                >
                  x
                </button>
              </div>
            ))}
            <div className={styles.gridHeaderCell} style={{ width: "50px" }}>
              Actions
            </div>
          </div>
        </div>

        {/* Body */}
        <div className={styles.gridBody}>
          {rows.map((row) => (
            <div key={row.id} className={styles.gridRow}>
              {sortedColumns.map((col, colIndex) => {
                const isEditing =
                  editingCell?.rowId === row.id &&
                  editingCell?.columnId === col.id;
                const value = row.data[col.id];

                return (
                  <Cell
                    key={col.id}
                    value={value}
                    dataType={col.dataType}
                    referencedTableId={col.referencedTableId}
                    isEditing={isEditing}
                    onClick={() =>
                      handleCellClick(row.id, col.id, col.dataType)
                    }
                    onBlur={handleCellBlur}
                    onChange={(newValue) =>
                      onCellUpdate(row.id, col.id, newValue)
                    }
                    onKeyDown={(e) => handleKeyDown(e, row.id, colIndex)}
                  />
                );
              })}
              <div className={styles.gridCell} style={{ width: "50px" }}>
                <button
                  type="button"
                  onClick={() => onDeleteRow(row.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    opacity: 0.5,
                    fontSize: "12px",
                  }}
                  title="Delete row"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {/* Add row button */}
          <div className={styles.addRowButton} onClick={onAddRow}>
            <div className={styles.addRowCell} style={{ gridColumn: "1 / -1" }}>
              + Add row
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
