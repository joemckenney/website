import { gateway } from "@api/sdk";
import { useCallback, useEffect, useState } from "react";

import * as styles from "./app.css";
import { DebugInfo } from "./components/debug-info";
import { setupApiClient } from "./lib/api-client";
import {
  getAccessToken,
  isAuthenticated,
  logout,
  setAccessToken,
} from "./lib/auth";
import { decodeJWT, getTimeUntilExpiry } from "./lib/jwt-utils";

// Use environment variable or default to localhost for local dev
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
setupApiClient(API_URL);

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Debug state
  const [tokenExpiry, setTokenExpiry] = useState<string>("");

  const handleLogout = useCallback(async () => {
    await logout();
    setAuthenticated(false);
    setUserEmail(null);
    window.location.href = window.location.origin; // Return to client home
  }, []);

  const fetchUserInfo = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await gateway.whoami();

      if (response.data) {
        setUserEmail(response.data.email);
      } else if (response.error) {
        console.error("Failed to fetch user info:", response.error);
        handleLogout();
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    }
  }, [handleLogout]);

  // Extract access token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const error = params.get("error");

    if (error) {
      alert(`Authentication failed: ${error}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (accessToken) {
      setAccessToken(accessToken);
      setAuthenticated(true);
      window.history.replaceState({}, "", window.location.pathname);
      fetchUserInfo();
    } else if (authenticated) {
      fetchUserInfo();
    }
  }, [authenticated, fetchUserInfo]);

  // Update token expiry every second
  useEffect(() => {
    if (!authenticated) return;

    const interval = setInterval(() => {
      const token = getAccessToken();
      if (token) {
        const decoded = decodeJWT(token);
        if (decoded) {
          setTokenExpiry(getTimeUntilExpiry(decoded.exp));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [authenticated]);

  const handleLogin = () => {
    // Redirect to the API's Google OAuth endpoint
    window.location.href = `${API_URL}/auth/google`;
  };

  const handlePing = async () => {
    try {
      const response = await gateway.ping();

      if (response.data) {
        console.log(response.data.message);
      }
    } catch (error: any) {
      console.error("Ping error:", error);
      alert("Failed to ping. Please try again.");
    }
  };

  if (!authenticated) {
    return (
      <div className={styles.unauthPage}>
        <div className={styles.unauthBox}>
          <h1 className={styles.unauthTitle}>Not Authenticated</h1>
          <p className={styles.unauthText}>
            Please sign in with Google to access this application.
          </p>
          <button onClick={handleLogin} className={styles.primaryButton}>
            Login with Google
          </button>
        </div>
      </div>
    );
  }

  const accessToken = getAccessToken();
  const decodedToken = accessToken ? decodeJWT(accessToken) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>API Client</h1>
          <p className={styles.subtitle}>
            Authenticated as: {userEmail || "Loading..."}
          </p>
        </div>
        <button onClick={handleLogout} className={styles.button}>
          Logout
        </button>
      </header>

      <DebugInfo
        userEmail={userEmail}
        accessToken={accessToken}
        decodedToken={decodedToken}
        tokenExpiry={tokenExpiry}
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Endpoints</h2>
        <div className={styles.endpointsGrid}>
          <div className={styles.endpointBox}>
            <h3 className={styles.subsectionTitle}>Ping Endpoint</h3>
            <button onClick={handlePing} className={styles.button}>
              {"Ping Server"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
