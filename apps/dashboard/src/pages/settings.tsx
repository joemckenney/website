import { useCallback, useEffect, useState } from "react";
import {
  disconnectStrava,
  getStravaAuthUrl,
  getStravaStatus,
} from "../lib/strava";
import * as styles from "../styles/settings.css";

interface StravaConnectionState {
  connected: boolean;
  configured?: boolean;
  athleteId?: string;
  athleteName?: string;
  isLoading: boolean;
  error?: string;
}

export default function SettingsPage() {
  const [strava, setStrava] = useState<StravaConnectionState>({
    connected: false,
    isLoading: true,
  });

  const loadStravaStatus = useCallback(async () => {
    try {
      const status = await getStravaStatus();
      setStrava({
        connected: status.connected,
        configured: status.configured,
        athleteId: status.athleteId,
        athleteName: status.athleteName,
        isLoading: false,
      });
    } catch (error) {
      setStrava({
        connected: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load status",
      });
    }
  }, []);

  useEffect(() => {
    loadStravaStatus();

    // Check for callback params (success/error from OAuth)
    const params = new URLSearchParams(window.location.search);
    const stravaSuccess = params.get("strava_success");
    const stravaError = params.get("strava_error");

    if (stravaSuccess) {
      // Reload status after successful connection
      loadStravaStatus();
      window.history.replaceState({}, "", window.location.pathname);
    } else if (stravaError) {
      setStrava((prev) => ({
        ...prev,
        error: stravaError,
        isLoading: false,
      }));
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [loadStravaStatus]);

  const handleConnect = async () => {
    setStrava((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Fetch the OAuth URL from the server
      const authUrl = await getStravaAuthUrl();
      // Redirect to Strava OAuth
      window.location.href = authUrl;
    } catch (error) {
      setStrava((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      }));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Strava?")) {
      return;
    }

    setStrava((prev) => ({ ...prev, isLoading: true }));

    try {
      await disconnectStrava();
      setStrava({
        connected: false,
        isLoading: false,
      });
    } catch (error) {
      setStrava((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to disconnect",
      }));
    }
  };

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>Settings</span>
      </header>

      <div className={styles.container}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Integrations</h2>

          <div className={styles.card}>
            <div className={styles.connectionRow}>
              <div className={styles.connectionInfo}>
                <div className={styles.connectionIcon}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    role="img"
                    aria-label="Strava"
                  >
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                </div>
                <div className={styles.connectionDetails}>
                  <span className={styles.connectionName}>Strava</span>
                  {strava.isLoading ? (
                    <span className={styles.connectionStatus}>Loading...</span>
                  ) : strava.configured === false ? (
                    <span
                      className={`${styles.connectionStatus} ${styles.statusDisconnected}`}
                    >
                      Not configured (set STRAVA_CLIENT_ID)
                    </span>
                  ) : strava.connected ? (
                    <span
                      className={`${styles.connectionStatus} ${styles.statusConnected}`}
                    >
                      Connected
                      {strava.athleteName && ` as ${strava.athleteName}`}
                    </span>
                  ) : (
                    <span
                      className={`${styles.connectionStatus} ${styles.statusDisconnected}`}
                    >
                      Not connected
                    </span>
                  )}
                </div>
              </div>

              {!strava.isLoading &&
                strava.configured !== false &&
                (strava.connected ? (
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className={styles.disconnectButton}
                    disabled={strava.isLoading}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnect}
                    className={styles.connectButton}
                    disabled={strava.isLoading}
                  >
                    Connect
                  </button>
                ))}
            </div>

            {strava.error && (
              <div
                style={{
                  marginTop: "12px",
                  color: "#991b1b",
                  fontSize: "14px",
                }}
              >
                Error: {strava.error}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
