import { gateway } from "@gateway/sdk";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { TopNav } from "../components/top-nav";
import { BaseProvider, useBaseContext } from "../contexts/base-context";
import {
  logout as authLogout,
  clearTokens,
  ensureValidToken,
  isAuthenticated,
} from "../lib/auth";
import * as styles from "../styles/layout.css";

interface UserInfo {
  email: string;
}

function RootLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { baseName } = useBaseContext();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    async function fetchUser() {
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

  if (isLoginPage) {
    return <Outlet />;
  }

  return (
    <div className={styles.container}>
      <TopNav
        userEmail={user?.email}
        onLogout={handleLogout}
        baseName={baseName}
      />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export default function RootLayout() {
  return (
    <BaseProvider>
      <RootLayoutInner />
    </BaseProvider>
  );
}
