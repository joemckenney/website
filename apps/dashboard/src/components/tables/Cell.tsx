import { useRef, useEffect } from "react";
import * as styles from "../../styles/tables.css";

interface CellProps {
  value: unknown;
  dataType: "text" | "number" | "boolean" | "date" | "select";
  isEditing: boolean;
  onClick: () => void;
  onBlur: () => void;
  onChange: (value: unknown) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function Cell({
  value,
  dataType,
  isEditing,
  onClick,
  onBlur,
  onChange,
  onKeyDown,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBooleanToggle = () => {
    onChange(!value);
  };

  // Boolean type renders as checkbox
  if (dataType === "boolean") {
    return (
      <div className={styles.gridCell} onClick={handleBooleanToggle}>
        <input
          type="checkbox"
          className={styles.cellCheckbox}
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className={`${styles.gridCell} ${styles.cellEditing}`}>
        {dataType === "number" ? (
          <input
            ref={inputRef}
            type="number"
            className={styles.cellInput}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => {
              const numValue =
                e.target.value === "" ? null : Number(e.target.value);
              onChange(numValue);
            }}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        ) : dataType === "date" ? (
          <input
            ref={inputRef}
            type="date"
            className={styles.cellInput}
            value={value ? String(value).split("T")[0] : ""}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            className={styles.cellInput}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        )}
      </div>
    );
  }

  // Display mode
  const displayValue = (() => {
    if (value === null || value === undefined) return "";
    if (dataType === "date") {
      try {
        return new Date(String(value)).toLocaleDateString();
      } catch {
        return String(value);
      }
    }
    return String(value);
  })();

  return (
    <div className={styles.gridCell} onClick={onClick}>
      {displayValue || <span style={{ opacity: 0.3 }}>-</span>}
    </div>
  );
}
