import { tablesService } from "@tables/sdk";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ensureValidToken } from "../../lib/auth";
import * as styles from "../../styles/tables.css";

interface BaseItem {
  id: string;
  name: string;
  tableCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function BasesListPage() {
  const navigate = useNavigate();
  const [bases, setBases] = useState<BaseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");

  useEffect(() => {
    loadBases();
  }, []);

  async function loadBases() {
    const token = await ensureValidToken();
    if (!token) {
      setError("Not authenticated");
      setIsLoading(false);
      return;
    }

    try {
      const response = await tablesService.listBases({});

      if (response.error || !response.data) {
        setError("Failed to load bases");
        setIsLoading(false);
        return;
      }

      setBases(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bases");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateBase() {
    if (!newBaseName.trim()) return;

    const token = await ensureValidToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }

    try {
      const response = await tablesService.createBase({
        body: {
          name: newBaseName.trim(),
        },
      });

      if (response.error || !response.data) {
        setError("Failed to create base");
        return;
      }

      // Navigate to the new base
      navigate(`/bases/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create base");
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
        <span className={styles.title}>Bases</span>
        <button
          type="button"
          className={styles.newButton}
          onClick={() => setIsCreating(true)}
        >
          New base
        </button>
      </header>

      <div className={styles.container}>
        {isLoading && <div className={styles.loading}>Loading bases...</div>}

        {error && <div className={styles.error}>{error}</div>}

        {!isLoading && !error && bases.length === 0 && (
          <div className={styles.empty}>
            <p>No bases yet.</p>
            <button
              type="button"
              className={styles.emptyLink}
              onClick={() => setIsCreating(true)}
            >
              Create your first base
            </button>
          </div>
        )}

        {!isLoading && !error && bases.length > 0 && (
          <ul className={styles.list}>
            {bases.map((base) => (
              <li key={base.id}>
                <Link to={`/bases/${base.id}`} className={styles.item}>
                  <span className={styles.itemTitle}>{base.name}</span>
                  <span className={styles.itemDate}>
                    {base.tableCount} table{base.tableCount !== 1 ? "s" : ""} ·{" "}
                    {formatDate(base.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Create Base Modal */}
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
            <h2 className={styles.modalTitle}>Create New Base</h2>
            <div className={styles.formField}>
              <label className={styles.formLabel} htmlFor="baseName">
                Base Name
              </label>
              <input
                id="baseName"
                type="text"
                className={styles.formInput}
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                placeholder="e.g., My Workbook, Project X"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateBase();
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
                onClick={handleCreateBase}
                disabled={!newBaseName.trim()}
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
