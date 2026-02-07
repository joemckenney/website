import { useState } from "react";
import * as styles from "../../styles/tables.css";

interface AddColumnModalProps {
  onClose: () => void;
  onAdd: (
    name: string,
    dataType: "text" | "number" | "boolean" | "date" | "select",
  ) => void;
}

export function AddColumnModal({ onClose, onAdd }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<
    "text" | "number" | "boolean" | "date" | "select"
  >("text");

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), dataType);
  };

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
            onChange={(e) => setDataType(e.target.value as typeof dataType)}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Checkbox</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
          </select>
        </div>

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
            disabled={!name.trim()}
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
}
