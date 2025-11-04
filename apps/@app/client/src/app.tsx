import { useState, useEffect } from "react";
import { client, postSquared } from "@app/sdk";
import * as styles from "./app.css";
import {
  getAccessToken,
  setTokens,
  isAuthenticated,
  logout,
  refreshAccessToken,
} from "./lib/auth";

// Configure SDK client base URL
client.setConfig({
  baseUrl: "http://localhost:3000",
});

function App() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Extract tokens from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const error = params.get("error");

    if (error) {
      alert(`Authentication failed: ${error}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    if (accessToken && refreshToken) {
      setTokens(accessToken, refreshToken);
      setAuthenticated(true);
      window.history.replaceState({}, "", window.location.pathname);
      fetchUserInfo();
    } else if (authenticated) {
      fetchUserInfo();
    }
  }, []);

  const fetchUserInfo = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch("http://localhost:3000/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email);
      } else if (response.status === 401) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          fetchUserInfo();
        } else {
          handleLogout();
        }
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    }
  };

  const handleLogout = async () => {
    await logout();
    setAuthenticated(false);
    setUserEmail(null);
    window.location.href = "http://localhost:5000";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(input);
    if (isNaN(num)) return;

    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await postSquared({
        body: { number: num },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data) {
        setResult(response.data.result);
      }
    } catch (error: any) {
      // Handle 401 - token expired
      if (error?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          // Retry the request
          handleSubmit(e);
        } else {
          alert("Session expired. Please login again.");
          handleLogout();
        }
      } else {
        console.error("API error:", error);
        alert("Failed to calculate. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>Not Authenticated</h1>
        <p>Please login from the main app to access this page.</p>
        <button
          onClick={() => (window.location.href = "http://localhost:5000")}
          style={{ padding: "0.5rem 1rem", fontSize: "1rem", cursor: "pointer" }}
        >
          Go to Main App
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 className={styles.title}>Squared Calculator</h1>
          {userEmail && (
            <p style={{ color: "#666", fontSize: "0.9rem" }}>
              Logged in as: {userEmail}
            </p>
          )}
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
            background: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
          }}
        >
          Logout
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter a number"
          disabled={loading}
          style={{
            padding: "0.5rem",
            fontSize: "1rem",
            marginRight: "0.5rem",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Calculating..." : "Calculate"}
        </button>
      </form>
      {result !== null && (
        <p style={{ marginTop: "1rem", fontSize: "1.25rem" }}>
          {input}² = <span className={styles.result}>{result}</span>
        </p>
      )}
    </div>
  );
}

export default App;
