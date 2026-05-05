import { gateway } from "@gateway/sdk";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { TopNav } from "../components/top-nav";
import {
  logout as authLogout,
  clearTokens,
  isAuthenticated,
} from "../lib/auth";
import * as styles from "../styles/layout.css";

interface UserInfo {
  email: string;
}

export default function RootLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    async function fetchUser() {
      if (isLoginPage) {
        setIsLoading(false);
        return;
      }

      if (!isAuthenticated()) {
        setIsLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      try {
        const response = await gateway.whoami();

        if (response.error) {
          if (response.response) {
            clearTokens();
            navigate("/login", { replace: true });
          } else {
            setAuthError(
              "Unable to reach the server. Please check your connection.",
            );
          }
          return;
        }

        if (response.data) {
          setUser({ email: response.data.email });
        }
      } catch {
        setAuthError(
          "Unable to reach the server. Please check your connection.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [navigate, isLoginPage]);

  const handleLogout = useCallback(async () => {
    await authLogout();
    setUser(null);
    navigate("/login", { replace: true });
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

  if (authError) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>{authError}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <TopNav userEmail={user.email} onLogout={handleLogout} />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
