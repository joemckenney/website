import { gateway } from "@gateway/sdk";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { TopNav } from "../components/top-nav";
import { BaseProvider, useBaseContext } from "../contexts/base-context";
import {
  logout as authLogout,
  clearTokens,
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
        // The request interceptor handles token validation and Authorization header
        const response = await gateway.whoami();

        if (response.error) {
          // Distinguish network errors from auth errors
          if (response.response) {
            // Real HTTP error (401, 403, etc.) — clear tokens, redirect to login
            clearTokens();
            navigate("/login", { replace: true });
          } else {
            // Network error (server down) — preserve tokens, show error
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
        // Unexpected error — preserve tokens, show error
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

  // Guard: don't render the layout without user data
  if (!user) {
    return null;
  }

  return (
    <div className={styles.container}>
      <TopNav
        userEmail={user.email}
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
