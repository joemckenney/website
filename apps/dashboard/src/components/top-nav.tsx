import { useState } from "react";
import { Link } from "react-router";
import * as styles from "../styles/layout.css";

interface TopNavProps {
  userEmail?: string | null;
  onLogout?: () => void;
}

export function TopNav({ userEmail, onLogout }: TopNavProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

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
      <div className={styles.navLeft} />

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
