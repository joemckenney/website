import { tablesService } from "@tables/sdk";
import { useEffect, useRef, useState } from "react";
import * as styles from "../../styles/tables.css";

interface RelationOption {
  id: string;
  display: string;
}

interface CellProps {
  value: unknown;
  dataType: "text" | "number" | "boolean" | "date" | "select" | "relation";
  referencedTableId?: string;
  isEditing: boolean;
  onClick: () => void;
  onBlur: () => void;
  onChange: (value: unknown) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function Cell({
  value,
  dataType,
  referencedTableId,
  isEditing,
  onClick,
  onBlur,
  onChange,
  onKeyDown,
}: CellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [relationOptions, setRelationOptions] = useState<RelationOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (isEditing && selectRef.current) {
      selectRef.current.focus();
    }
  }, [isEditing]);

  // Fetch referenced table rows when entering edit mode on a relation cell
  useEffect(() => {
    if (!isEditing || dataType !== "relation" || !referencedTableId) return;

    let cancelled = false;
    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        // Fetch table schema to find the primary text column
        const tableRes = await tablesService.getTable({
          path: { tableId: referencedTableId },
        });
        const tableCols = tableRes.data?.columns ?? [];
        const primaryCol = tableCols
          .filter((c) => c.dataType === "text")
          .sort((a, b) => a.position - b.position)[0];

        // Fetch rows
        const rowsRes = await tablesService.listRows({
          path: { tableId: referencedTableId },
          query: { limit: 200 },
        });
        const rows = rowsRes.data?.rows ?? [];

        if (cancelled) return;

        setRelationOptions(
          rows.map((row) => {
            const display = primaryCol
              ? ((row.data[primaryCol.id] as string) ?? row.id)
              : row.id;
            return { id: row.id, display: String(display) };
          }),
        );
      } catch (err) {
        console.error("Failed to load relation options:", err);
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [isEditing, dataType, referencedTableId]);

  // Local edit buffer — only commit to parent on blur/Enter/Tab
  const [localValue, setLocalValue] = useState<string>("");
  const hasCommitted = useRef(false);

  // Sync local buffer when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (dataType === "date") {
        setLocalValue(value ? String(value).split("T")[0] : "");
      } else {
        setLocalValue(
          value === null || value === undefined ? "" : String(value),
        );
      }
      hasCommitted.current = false;
    }
  }, [isEditing, value, dataType]);

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

  // Relation type
  if (dataType === "relation") {
    if (isEditing) {
      const currentId =
        value &&
        typeof value === "object" &&
        "id" in (value as Record<string, unknown>)
          ? (value as { id: string }).id
          : typeof value === "string"
            ? value
            : "";

      return (
        <div className={`${styles.gridCell} ${styles.cellEditing}`}>
          <select
            ref={selectRef}
            className={styles.cellInput}
            value={currentId}
            onChange={(e) => {
              onChange(e.target.value || null);
              onBlur();
            }}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            disabled={loadingOptions}
          >
            <option value="">
              {loadingOptions ? "Loading..." : "-- None --"}
            </option>
            {relationOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.display}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // Display mode
    const displayValue = (() => {
      if (value === null || value === undefined) return null;
      if (
        typeof value === "object" &&
        value !== null &&
        "id" in (value as Record<string, unknown>)
      ) {
        const rel = value as { id: string; display: string | null };
        if (rel.display === null) return "Deleted";
        return rel.display;
      }
      if (typeof value === "string") {
        return value.length > 8 ? `${value.slice(0, 8)}...` : value;
      }
      return null;
    })();

    if (displayValue === null) {
      return (
        <div className={styles.gridCell} onClick={onClick}>
          <span style={{ opacity: 0.3 }}>-</span>
        </div>
      );
    }

    const isDeleted = displayValue === "Deleted";

    return (
      <div className={styles.gridCell} onClick={onClick}>
        <span
          style={{
            ...(isDeleted
              ? { opacity: 0.5, fontStyle: "italic" }
              : { color: "#3b82f6" }),
          }}
        >
          {displayValue}
        </span>
      </div>
    );
  }

  const commitValue = () => {
    if (hasCommitted.current) return;
    hasCommitted.current = true;

    if (dataType === "number") {
      onChange(localValue === "" ? null : Number(localValue));
    } else {
      onChange(localValue);
    }
  };

  const handleEditBlur = () => {
    commitValue();
    onBlur();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab") {
      commitValue();
    }
    onKeyDown(e);
  };

  // Editing mode
  if (isEditing) {
    return (
      <div className={`${styles.gridCell} ${styles.cellEditing}`}>
        {dataType === "number" ? (
          <input
            ref={inputRef}
            type="number"
            className={styles.cellInput}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
          />
        ) : dataType === "date" ? (
          <input
            ref={inputRef}
            type="date"
            className={styles.cellInput}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            className={styles.cellInput}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleEditKeyDown}
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
