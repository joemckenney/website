import * as styles from "../app.css";
import {formatTimestamp} from "../lib/jwt-utils";

interface DebugInfoProps {
  userEmail: string | null;
  accessToken: string | null;
  decodedToken: {exp: number; iat: number; type?: string} | null;
  tokenExpiry: string;
}

export function DebugInfo({userEmail, accessToken, decodedToken, tokenExpiry}: DebugInfoProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Debug Information</h2>
      <div className={styles.debugGrid}>
        <div className={styles.debugLabel}>Email:</div>
        <div className={styles.debugValue}>{userEmail || "—"}</div>

        <div className={styles.debugLabel}>Access Token:</div>
        <div className={styles.debugValue}>
          {accessToken ? `${accessToken}` : "—"}
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
  );
}
