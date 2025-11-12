import {useState, useEffect} from "react";
import {postSquared, getPing, getAuthMe} from "@app/sdk";
import * as styles from "./app.css";
import {
  getAccessToken,
  setAccessToken,
  isAuthenticated,
  logout,
  refreshAccessToken,
} from "./lib/auth";
import {decodeJWT, getTimeUntilExpiry, formatTimestamp} from "./lib/jwt-utils";
import {setupApiClient, getAuthHeaders} from "./lib/api-client";

// Configure SDK client
setupApiClient("http://localhost:3000");

function App() {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Squared endpoint state
  const [squaredInput, setSquaredInput] = useState("");
  const [squaredResult, setSquaredResult] = useState<number | null>(null);
  const [squaredLoading, setSquaredLoading] = useState(false);

  // Ping endpoint state
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingTiming, setPingTiming] = useState<number | null>(null);
  const [pingRequest, setPingRequest] = useState<any>(null);
  const [pingResponse, setPingResponse] = useState<any>(null);

  // Squared timing/request/response
  const [squaredTiming, setSquaredTiming] = useState<number | null>(null);
  const [squaredRequest, setSquaredRequest] = useState<any>(null);
  const [squaredResponse, setSquaredResponse] = useState<any>(null);

  // Debug state
  const [tokenExpiry, setTokenExpiry] = useState<string>("");

  // Extract access token from URL on mount (refresh token is now httpOnly cookie)
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
  }, []);

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

  const fetchUserInfo = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      // SDK methods return properly typed responses
      // response.data is typed as { email: string } | undefined
      const response = await getAuthMe({
        headers: await getAuthHeaders(),
      });

      if (response.data) {
        // TypeScript knows response.data has { email: string }
        setUserEmail(response.data.email);
      } else if (response.error) {
        console.error("Failed to fetch user info:", response.error);
        // Try refreshing once on error
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          fetchUserInfo(); // Retry
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

  const handleSquaredSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(squaredInput);
    if (isNaN(num)) return;

    setSquaredLoading(true);
    const startTime = performance.now();
    const token = getAccessToken();

    const requestData = {
      method: "POST",
      url: "/squared",
      headers: {
        Authorization: token ? `Bearer ${token.substring(0, 20)}...` : "none",
        "Content-Type": "application/json",
      },
      body: {number: num},
    };
    setSquaredRequest(requestData);

    try {
      const response = await postSquared({
        body: {number: num},
        headers: await getAuthHeaders(),
      });

      const endTime = performance.now();
      setSquaredTiming(Math.round(endTime - startTime));

      if (response.data) {
        setSquaredResult(response.data.result);
        setSquaredResponse({
          status: 200,
          data: response.data,
        });
      } else if (response.error) {
        // Handle 401 - try refreshing
        if (response.response.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            handleSquaredSubmit(e); // Retry
            return;
          } else {
            handleLogout();
            return;
          }
        }

        setSquaredResponse({
          status: response.response.status,
          error: response.error,
        });
        alert("Failed to calculate. Please try again.");
      }
    } catch (error: any) {
      const endTime = performance.now();
      setSquaredTiming(Math.round(endTime - startTime));

      console.error("API error:", error);
      setSquaredResponse({
        status: 500,
        error: error?.message || "Unknown error",
      });
      alert("Failed to calculate. Please try again.");
    } finally {
      setSquaredLoading(false);
    }
  };

  const handlePing = async () => {
    setPingLoading(true);
    const startTime = performance.now();

    const requestData = {
      method: "GET",
      url: "/ping",
      headers: {},
      body: null,
    };
    setPingRequest(requestData);

    try {
      const response = await getPing();

      const endTime = performance.now();
      setPingTiming(Math.round(endTime - startTime));

      if (response.data) {
        setPingResult(response.data.message);
        setPingResponse({
          status: 200,
          data: response.data,
        });
      }
    } catch (error: any) {
      const endTime = performance.now();
      setPingTiming(Math.round(endTime - startTime));

      console.error("Ping error:", error);
      setPingResponse({
        status: error?.status || 500,
        error: error?.message || "Unknown error",
      });
      alert("Failed to ping. Please try again.");
    } finally {
      setPingLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className={styles.unauthPage}>
        <div className={styles.unauthBox}>
          <h1 className={styles.unauthTitle}>Not Authenticated</h1>
          <p className={styles.unauthText}>
            Please login from the main app to access this page.
          </p>
          <button
            onClick={() => (window.location.href = "http://localhost:5000")}
            className={styles.primaryButton}
          >
            Go to Main App
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

      {/* Debug Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Debug Information</h2>
        <div className={styles.debugGrid}>
          <div className={styles.debugLabel}>Email:</div>
          <div className={styles.debugValue}>{userEmail || "—"}</div>

          <div className={styles.debugLabel}>Access Token:</div>
          <div className={styles.debugValue}>
            {accessToken ? `${accessToken.substring(0, 40)}...` : "—"}
          </div>

          <div className={styles.debugLabel}>Token Type:</div>
          <div className={styles.debugValue}>
            {decodedToken?.type || "—"}
          </div>

          <div className={styles.debugLabel}>Issued At:</div>
          <div className={styles.debugValue}>
            {decodedToken ? formatTimestamp(decodedToken.iat) : "—"}
          </div>

          <div className={styles.debugLabel}>Expires At:</div>
          <div className={styles.debugValue}>
            {decodedToken ? formatTimestamp(decodedToken.exp) : "—"}
          </div>

          <div className={styles.debugLabel}>Time Until Expiry:</div>
          <div className={styles.debugValue}>{tokenExpiry || "—"}</div>

          <div className={styles.debugLabel}>Refresh Token:</div>
          <div className={styles.debugValue}>
            httpOnly cookie (not accessible)
          </div>
        </div>
      </section>

      {/* Endpoints Section */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Endpoints</h2>
        <div className={styles.endpointsGrid}>
          {/* Ping Endpoint */}
          <div className={styles.endpointBox}>
            <h3 className={styles.subsectionTitle}>Ping Endpoint</h3>
            <button
              onClick={handlePing}
              disabled={pingLoading}
              className={styles.button}
            >
              {pingLoading ? "Pinging..." : "Ping Server"}
            </button>
            {pingRequest && (
              <div className={styles.requestResponse}>
                <div className={styles.requestBox}>
                  <div className={styles.boxTitle}>Request</div>
                  <div className={styles.codeBlock}>
                    {JSON.stringify(pingRequest, null, 2)}
                  </div>
                </div>
                {pingResponse && (
                  <div className={styles.responseBox}>
                    <div className={styles.boxTitle}>Response</div>
                    <div className={styles.codeBlock}>
                      {JSON.stringify(pingResponse, null, 2)}
                    </div>
                    {pingTiming !== null && (
                      <div className={styles.timing}>
                        Response time: {pingTiming}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Squared Endpoint */}
          <div className={styles.endpointBox}>
            <h3 className={styles.subsectionTitle}>Squared Endpoint</h3>
            <form onSubmit={handleSquaredSubmit} className={styles.form}>
              <input
                type="number"
                value={squaredInput}
                onChange={(e) => setSquaredInput(e.target.value)}
                placeholder="Enter a number"
                disabled={squaredLoading}
                className={styles.input}
              />
              <button
                type="submit"
                disabled={squaredLoading}
                className={styles.button}
              >
                {squaredLoading ? "Calculating..." : "Calculate"}
              </button>
            </form>
            {squaredRequest && (
              <div className={styles.requestResponse}>
                <div className={styles.requestBox}>
                  <div className={styles.boxTitle}>Request</div>
                  <div className={styles.codeBlock}>
                    {JSON.stringify(squaredRequest, null, 2)}
                  </div>
                </div>
                {squaredResponse && (
                  <div className={styles.responseBox}>
                    <div className={styles.boxTitle}>Response</div>
                    <div className={styles.codeBlock}>
                      {JSON.stringify(squaredResponse, null, 2)}
                    </div>
                    {squaredTiming !== null && (
                      <div className={styles.timing}>
                        Response time: {squaredTiming}ms
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
