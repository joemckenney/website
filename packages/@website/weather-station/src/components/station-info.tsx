import { useEffect, useState } from "react";
import * as styles from "./weather-dashboard.css";

interface StationInfoProps {
  lastUpdate: Date | null;
  isHistorical: boolean;
}

function formatTime(date: Date, includeDate: boolean): string {
  if (includeDate) {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin === 1) return "1 min ago";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr === 1) return "1 hr ago";
  return `${diffHr} hrs ago`;
}

export function StationInfo({ lastUpdate, isHistorical }: StationInfoProps) {
  // Tick every 30s so the relative time stays fresh in live mode
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (isHistorical) return;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [isHistorical]);

  return (
    <div className={styles.stationHeader}>
      <span className={styles.stationName}>
        Comptche Ukiah Rd. &mdash; Mendocino, CA
      </span>
      <span className={styles.stationMeta}>
        177m
        {lastUpdate && isHistorical && (
          <> &middot; {formatTime(lastUpdate, true)}</>
        )}
        {lastUpdate && !isHistorical && (
          <> &middot; {formatTime(lastUpdate, false)} ({formatRelative(lastUpdate, now)})</>
        )}
      </span>
    </div>
  );
}
