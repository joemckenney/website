import { useState } from "react";
import * as styles from "../../styles/tables.css";

type ColumnType = "text" | "number" | "boolean" | "date" | "select" | "relation";

interface AddColumnModalProps {
  onClose: () => void;
  onAdd: (
    name: string,
    dataType: ColumnType,
    referencedTableId?: string,
  ) => void;
  tables?: Array<{ id: string; name: string }>;
  currentTableId?: string;
}

export function AddColumnModal({ onClose, onAdd, tables, currentTableId }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<ColumnType>("text");
  const [referencedTableId, setReferencedTableId] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (dataType === "relation" && !referencedTableId) return;
    onAdd(
      name.trim(),
      dataType,
      dataType === "relation" ? referencedTableId : undefined,
    );
  };

  const isSubmitDisabled = !name.trim() || (dataType === "relation" && !referencedTableId);

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        <h2 className={styles.modalTitle}>Add Column</h2>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="columnName">
            Column Name
          </label>
          <input
            id="columnName"
            type="text"
            className={styles.formInput}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Price, Status, Due Date"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />
        </div>

        <div className={styles.formField}>
          <label className={styles.formLabel} htmlFor="columnType">
            Data Type
          </label>
          <select
            id="columnType"
            className={styles.formSelect}
            value={dataType}
            onChange={(e) => {
              setDataType(e.target.value as ColumnType);
              if (e.target.value !== "relation") {
                setReferencedTableId("");
              }
            }}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Checkbox</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
            <option value="relation">Link to table</option>
          </select>
        </div>

        {dataType === "relation" && tables && (
          <div className={styles.formField}>
            <label className={styles.formLabel} htmlFor="referencedTable">
              Linked Table
            </label>
            <select
              id="referencedTable"
              className={styles.formSelect}
              value={referencedTableId}
              onChange={(e) => setReferencedTableId(e.target.value)}
            >
              <option value="">Select a table...</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.id === currentTableId ? " (self)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.modalButtonSecondary}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.modalButtonPrimary}
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}
