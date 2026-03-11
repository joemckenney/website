import { useMemo } from "react";
import type { LoadingProgress } from "../lib/audio-evolution-engine";
import type { PlaybackState, WeatherReading } from "../types/weather";
import * as styles from "./weather-dashboard.css";

interface TimelineProps {
  playbackState: PlaybackState;
  historyCache: WeatherReading[];
  activeRange?: number;
  loadingProgress?: LoadingProgress | null;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (timestamp: Date) => void;
  onGoLive: () => void;
  onStartHistorical: (hours: number) => void;
}

const SPEEDS = [1, 10, 60, 360, 1440];

const RANGES = [
  { label: "24H", hours: 24 },
  { label: "3D", hours: 72 },
  { label: "1W", hours: 168 },
  { label: "ALL", hours: 0 },
];

function formatTimestamp(date: Date, spansDays: boolean): string {
  if (spansDays) {
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

export function Timeline({
  playbackState,
  historyCache,
  activeRange,
  loadingProgress,
  onPlayPause,
  onSpeedChange,
  onSeek,
  onGoLive,
  onStartHistorical,
}: TimelineProps) {
  const { rangeStart, rangeEnd, progress, spansDays } = useMemo(() => {
    if (historyCache.length === 0) {
      return { rangeStart: new Date(), rangeEnd: new Date(), progress: 1, spansDays: false };
    }

    const start = new Date(historyCache[0].timestamp);
    const end = new Date(historyCache[historyCache.length - 1].timestamp);
    const cursor = playbackState.cursor.getTime();
    const range = end.getTime() - start.getTime();
    const prog = range > 0 ? (cursor - start.getTime()) / range : 1;
    const days = range > 12 * 60 * 60 * 1000; // show dates if > 12 hours

    return {
      rangeStart: start,
      rangeEnd: end,
      progress: Math.max(0, Math.min(1, prog)),
      spansDays: days,
    };
  }, [historyCache, playbackState.cursor]);

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    const range = rangeEnd.getTime() - rangeStart.getTime();
    const timestamp = new Date(rangeStart.getTime() + range * value);
    onSeek(timestamp);
  };

  return (
    <div className={styles.timelineSection}>
      <div className={styles.timelineControls}>
        {playbackState.mode === "live" ? (
          <>
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                className={styles.timelineButton}
                onClick={() => onStartHistorical(r.hours)}
                title={r.hours ? `Play last ${r.label}` : "Play all available history"}
              >
                {r.label}
              </button>
            ))}
          </>
        ) : activeRange !== undefined ? (
          <>
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                className={styles.timelineButton}
                data-active={r.hours === activeRange ? "true" : undefined}
                onClick={() => onStartHistorical(r.hours)}
                title={r.hours ? `Play last ${r.label}` : "Play all available history"}
              >
                {r.label}
              </button>
            ))}
            <span style={{ width: "1px", height: "16px", backgroundColor: "#ddd", margin: "0 2px" }} />
            <button
              type="button"
              className={styles.timelineButton}
              onClick={onPlayPause}
            >
              {playbackState.isPlaying ? "\u23F8" : "\u25B6"}
            </button>
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={styles.timelineButton}
                data-active={playbackState.speed === speed ? "true" : undefined}
                onClick={() => onSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.timelineButton}
              onClick={onPlayPause}
            >
              {playbackState.isPlaying ? "\u23F8" : "\u25B6"}
            </button>
            {SPEEDS.map((speed) => (
              <button
                key={speed}
                type="button"
                className={styles.timelineButton}
                data-active={playbackState.speed === speed ? "true" : undefined}
                onClick={() => onSpeedChange(speed)}
              >
                {speed}x
              </button>
            ))}
          </>
        )}
      </div>

      {playbackState.mode === "historical" && historyCache.length > 0 && (
        <>
          <span className={styles.timeLabel}>
            {formatTimestamp(rangeStart, spansDays)}
          </span>
          <div style={{ flex: 1, position: "relative", minWidth: "100px" }}>
            <input
              type="range"
              className={styles.scrubber}
              style={{ width: "100%" }}
              min={0}
              max={1}
              step={0.001}
              value={progress}
              onChange={handleScrub}
            />
            {loadingProgress && !loadingProgress.done && loadingProgress.total > 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: "-2px",
                  left: 0,
                  height: "2px",
                  width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
                  backgroundColor: "#999",
                  transition: "width 0.3s ease",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
          <span className={styles.timeLabel}>
            {loadingProgress && !loadingProgress.done
              ? `${loadingProgress.loaded}/${loadingProgress.total}`
              : formatTimestamp(rangeEnd, spansDays)}
          </span>
        </>
      )}

      <span className={styles.timeLabel}>
        {playbackState.mode === "live" ? (
          <strong>LIVE</strong>
        ) : (
          <button
            type="button"
            className={styles.timelineButton}
            onClick={onGoLive}
          >
            LIVE
          </button>
        )}
      </span>
    </div>
  );
}
