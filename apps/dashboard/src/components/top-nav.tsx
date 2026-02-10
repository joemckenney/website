import { useState } from "react";
import { Link, useLocation } from "react-router";
import * as styles from "../styles/layout.css";

interface TopNavProps {
  userEmail?: string | null;
  onLogout?: () => void;
  baseName?: string | null;
}

export function TopNav({ userEmail, onLogout, baseName }: TopNavProps) {
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isDataActive = location.pathname.startsWith("/bases");
  const isAgentsActive = location.pathname.startsWith("/agents");

  const initials = userEmail
    ? userEmail
        .split("@")[0]
        .split(".")
        .map((n) => n[0]?.toUpperCase())
        .join("")
        .slice(0, 2)
    : "??";

  return (
    <nav className={styles.topNav}>
      <div className={styles.navLeft}>
        {baseName ? (
          <div className={styles.navBreadcrumb}>
            <Link to="/bases" className={styles.navLink}>
              Data
            </Link>
            <span className={styles.navBreadcrumbSeparator}>/</span>
            <span className={styles.navBreadcrumbCurrent}>{baseName}</span>
          </div>
        ) : (
          <>
            <Link
              to="/bases"
              className={`${styles.navLink} ${isDataActive ? styles.navLinkActive : ""}`}
            >
              Data
            </Link>
            <Link
              to="/agents"
              className={`${styles.navLink} ${isAgentsActive ? styles.navLinkActive : ""}`}
            >
              Agents
            </Link>
          </>
        )}
      </div>

      <div className={styles.navRight}>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            className={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            {initials}
          </button>

          {showUserMenu && (
            <div className={styles.userMenu}>
              <div className={styles.userMenuEmail}>{userEmail}</div>
              <Link
                to="/settings"
                className={styles.userMenuItem}
                onClick={() => setShowUserMenu(false)}
              >
                Settings
              </Link>
              {onLogout && (
                <button
                  type="button"
                  className={styles.userMenuItem}
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                >
                  Logout
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
