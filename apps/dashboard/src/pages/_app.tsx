import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { gateway } from "@gateway/sdk";
import { Sidebar } from "../components/sidebar";
import {
  clearTokens,
  ensureValidToken,
  isAuthenticated,
  logout as authLogout,
} from "../lib/auth";
import * as styles from "../styles/layout.css";

interface UserInfo {
  email: string;
}

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    async function fetchUser() {
      // Skip auth check on login page
      if (isLoginPage) {
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated()) {
        setIsLoading(false);
        navigate("/login");
        return;
      }

      const token = await ensureValidToken();
      if (!token) {
        clearTokens();
        setIsLoading(false);
        navigate("/login");
        return;
      }

      try {
        const response = await gateway.whoami({
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.error || !response.data) {
          clearTokens();
          navigate("/login");
          return;
        }

        setUser({
          email: response.data.email,
        });
      } catch {
        clearTokens();
        navigate("/login");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [navigate, isLoginPage]);

  const handleLogout = useCallback(async () => {
    await authLogout();
    setUser(null);
    navigate("/login");
  }, [navigate]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>Loading...</div>
      </div>
    );
  }

  // Login page has no sidebar
  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className={styles.container}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userEmail={user?.email}
        onLogout={handleLogout}
      />
      <main
        className={`${styles.main} ${sidebarOpen ? styles.mainExpanded : ""}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
