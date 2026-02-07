import { tablesService } from "@tables/sdk";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ensureValidToken } from "../../lib/auth";
import * as styles from "../../styles/tables.css";

interface TableItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function TablesListPage() {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTableName, setNewTableName] = useState("");

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    const token = await ensureValidToken();
    if (!token) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const response = await tablesService.listTables({});

      if (response.error || !response.data) {
        setError("Failed to load tables");
        setIsLoading(false);
        return;
      }

      setTables(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tables");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTable() {
    if (!newTableName.trim()) return;

    const token = await ensureValidToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    try {
      const response = await tablesService.createTable({
        body: {
          name: newTableName.trim(),
          columns: [{ name: "Name", dataType: "text" }],
        },
      });

      if (response.error || !response.data) {
        setError("Failed to create table");
        return;
      }

      // Navigate to the new table
      navigate(`/tables/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create table");
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>Tables</span>
        <button
          type="button"
          className={styles.newButton}
          onClick={() => setIsCreating(true)}
        >
          New table
        </button>
      </header>

      <div className={styles.container}>
        {isLoading && <div className={styles.loading}>Loading tables...</div>}

        {error && <div className={styles.error}>{error}</div>}

        {!isLoading && !error && tables.length === 0 && (
          <div className={styles.empty}>
            <p>No tables yet.</p>
            <button
              type="button"
              className={styles.emptyLink}
              onClick={() => setIsCreating(true)}
            >
              Create your first table
            </button>
          </div>
        )}

        {!isLoading && !error && tables.length > 0 && (
          <ul className={styles.list}>
            {tables.map((table) => (
              <li key={table.id}>
                <Link to={`/tables/${table.id}`} className={styles.item}>
                  <span className={styles.itemTitle}>{table.name}</span>
                  <span className={styles.itemDate}>
                    {formatDate(table.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Table Modal */}
      {isCreating && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsCreating(false)}
          onKeyDown={(e) => e.key === "Escape" && setIsCreating(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={() => {}}
          >
            <h2 className={styles.modalTitle}>Create New Table</h2>
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
                placeholder="e.g., Inventory, Tasks, Contacts"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateTable();
                  }
                }}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalButtonSecondary}
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalButtonPrimary}
                onClick={handleCreateTable}
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
