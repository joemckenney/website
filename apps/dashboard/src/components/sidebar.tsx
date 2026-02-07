import { Text } from "@crow/text";
import { Link } from "react-router";
import * as styles from "../styles/layout.css";

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
  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(".")
        .map((n) => n[0]?.toUpperCase())
        .join("")
        .slice(0, 2)
    : "??";

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
          <Link to="/tables" className={styles.navItem}>
            <svg
              className={styles.navItemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 10h18M3 14h18M10 3v18M14 3v18" />
            </svg>
            Tables
          </Link>
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
