import { Text } from "@crow/text";
import { tablesService } from "@tables/sdk";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ensureValidToken } from "../lib/auth";
import * as styles from "../styles/layout.css";

interface BaseWithTables {
  id: string;
  name: string;
  tables: { id: string; name: string }[];
}

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
}

export function Sidebar({
  isOpen,
  onToggle,
  userEmail,
  onLogout,
}: SidebarProps) {
  const navigate = useNavigate();
  const [bases, setBases] = useState<BaseWithTables[]>([]);
  const [expandedBases, setExpandedBases] = useState<Set<string>>(new Set());
  const [isCreatingBase, setIsCreatingBase] = useState(false);
  const [newBaseName, setNewBaseName] = useState("");

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(".")
        .map((n) => n[0]?.toUpperCase())
        .join("")
        .slice(0, 2)
    : "??";

  useEffect(() => {
    loadBases();
  }, []);

  async function loadBases() {
    const token = await ensureValidToken();
    if (!token) return;

    try {
      const response = await tablesService.listBases({});
      if (response.error || !response.data) return;

      // Load tables for each base
      const basesWithTables = await Promise.all(
        response.data.map(async (base) => {
          const baseResponse = await tablesService.getBase({
            path: { baseId: base.id },
          });
          return {
            id: base.id,
            name: base.name,
            tables: baseResponse.data?.tables ?? [],
          };
        }),
      );

      setBases(basesWithTables);
    } catch (err) {
      console.error("Failed to load bases:", err);
    }
  }

  function toggleBase(baseId: string) {
    setExpandedBases((prev) => {
      const next = new Set(prev);
      if (next.has(baseId)) {
        next.delete(baseId);
      } else {
        next.add(baseId);
      }
      return next;
    });
  }

  async function handleCreateBase() {
    if (!newBaseName.trim()) return;

    const token = await ensureValidToken();
    if (!token) return;

    try {
      const response = await tablesService.createBase({
        body: { name: newBaseName.trim() },
      });

      if (response.error || !response.data) return;

      setNewBaseName("");
      setIsCreatingBase(false);
      navigate(`/bases/${response.data.id}`);
      loadBases();
    } catch (err) {
      console.error("Failed to create base:", err);
    }
  }

  return (
    <aside
      className={`${styles.headerTray} ${isOpen ? styles.headerTrayOpen : ""}`}
    >
      <button
        type="button"
        className={styles.headerToggle}
        onClick={onToggle}
        aria-label="Toggle menu"
      >
        <svg
          className={`${styles.headerToggleIcon} ${isOpen ? styles.headerToggleIconOpen : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div
        className={`${styles.headerBrand} ${isOpen ? styles.headerBrandVisible : ""}`}
      >
        <h1 className={styles.brandTitle}>Agent</h1>
        <span className={styles.brandVersion}>v0.1.0 — Local</span>
      </div>

      <nav
        className={`${styles.headerNav} ${isOpen ? styles.headerNavVisible : ""}`}
      >
        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>Conversations</div>
          <Link to="/new" className={styles.navItem}>
            <svg
              className={styles.navItemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New conversation
          </Link>
          <Link to="/history" className={styles.navItem}>
            <svg
              className={styles.navItemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </Link>
        </div>

        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>Data</div>
          {bases.map((base) => (
            <div key={base.id} className={styles.baseItem}>
              <div className={styles.baseHeader}>
                <button
                  type="button"
                  onClick={() => toggleBase(base.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  <svg
                    className={`${styles.baseExpandIcon} ${expandedBases.has(base.id) ? styles.baseExpandIconOpen : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
                <Link to={`/bases/${base.id}`} className={styles.baseName}>
                  {base.name}
                </Link>
              </div>
              <div
                className={`${styles.baseTableList} ${expandedBases.has(base.id) ? styles.baseTableListOpen : ""}`}
              >
                {base.tables.map((table) => (
                  <Link
                    key={table.id}
                    to={`/bases/${base.id}?table=${table.id}`}
                    className={styles.baseTableItem}
                  >
                    {table.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {isCreatingBase ? (
            <div style={{ padding: "4px 0" }}>
              <input
                type="text"
                value={newBaseName}
                onChange={(e) => setNewBaseName(e.target.value)}
                placeholder="Base name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateBase();
                  if (e.key === "Escape") {
                    setNewBaseName("");
                    setIsCreatingBase(false);
                  }
                }}
                onBlur={() => {
                  if (!newBaseName.trim()) {
                    setIsCreatingBase(false);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "4px 8px",
                  fontSize: "12px",
                  border: "1px solid #d6d3d1",
                  fontFamily: "inherit",
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              className={styles.newBaseButton}
              onClick={() => setIsCreatingBase(true)}
            >
              <svg
                className={styles.navItemIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New Base
            </button>
          )}
        </div>

        <div className={styles.navSection}>
          <div className={styles.navSectionTitle}>System</div>
          <Link to="/settings" className={styles.navItem}>
            <svg
              className={styles.navItemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
          <div className={styles.navItem}>
            <svg
              className={styles.navItemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Logs
          </div>
        </div>
      </nav>

      <div
        className={`${styles.headerUser} ${isOpen ? styles.headerUserVisible : ""}`}
      >
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>{initials}</div>
          <div className={styles.userDetails}>
            <Text size="sm">{userEmail || "Guest"}</Text>
            {onLogout && (
              <button
                type="button"
                className={styles.logoutButton}
                onClick={onLogout}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
