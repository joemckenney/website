import { useCallback, useEffect, useRef, useState } from "react";
import { AudioEvolutionEngine } from "../lib/audio-evolution-engine";
import { AudioSynthesizer } from "../lib/audio-synthesizer";
import type { PlaybackState, WeatherReading } from "../types/weather";
import { FrequencyVisualizer } from "./frequency-visualizer";
import { LiveReadings } from "./live-readings";
import { StationInfo } from "./station-info";
import { Timeline } from "./timeline";
import * as styles from "./weather-dashboard.css";

function getUrlParams(): { mode?: string; range?: string; speed?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    mode: params.get("mode") ?? undefined,
    range: params.get("range") ?? undefined,
    speed: params.get("speed") ?? undefined,
  };
}

function updateUrl(mode: string, range?: number, speed?: number) {
  const params = new URLSearchParams();
  if (mode === "historical") {
    params.set("mode", "historical");
    if (range !== undefined) params.set("range", range === 0 ? "all" : String(range));
    if (speed !== undefined) params.set("speed", String(speed));
  }
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, "", url);
}

const RANGE_MAP: Record<string, number> = { "24": 24, "72": 72, "168": 168, all: 0 };

export function WeatherDashboard() {
  const [reading, setReading] = useState<WeatherReading | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    mode: "live",
    speed: 1,
    cursor: new Date(),
    isPlaying: true,
  });
  const [evolutionCount, setEvolutionCount] = useState(0);
  const [activeRange, setActiveRange] = useState<number | undefined>(undefined);

  const synthRef = useRef<AudioSynthesizer | null>(null);
  const engineRef = useRef<AudioEvolutionEngine | null>(null);
  const initRef = useRef(false);

  // Initialize audio on first user interaction
  const handleStart = useCallback(async () => {
    if (isPlaying) return;

    const synth = new AudioSynthesizer();
    await synth.initialize();
    synthRef.current = synth;

    const engine = new AudioEvolutionEngine();
    engineRef.current = engine;

    const initialReading = await engine.start(synth, (newReading, _params) => {
      setReading(newReading);
      setEvolutionCount((c) => c + 1);
      setPlaybackState(engine.getPlaybackState());
    });

    if (initialReading) {
      setReading(initialReading);
      setIsPlaying(true);
      setIsConnected(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    synthRef.current?.stop();
    engineRef.current?.stop();
    setIsPlaying(false);
    setIsConnected(false);
    setActiveRange(undefined);
    updateUrl("live");
  }, []);

  const handlePlayPause = useCallback(async () => {
    await engineRef.current?.togglePlayPause();
    setPlaybackState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    engineRef.current?.setPlaybackSpeed(speed);
    setPlaybackState((prev) => {
      if (prev.mode === "historical") updateUrl("historical", activeRange, speed);
      return { ...prev, speed };
    });
  }, [activeRange]);

  const handleSeek = useCallback((timestamp: Date) => {
    engineRef.current?.seekTo(timestamp);
    setPlaybackState((prev) => ({ ...prev, cursor: timestamp }));
  }, []);

  const handleGoLive = useCallback(async () => {
    await engineRef.current?.resumeLive();
    setPlaybackState((prev) => ({ ...prev, mode: "live" }));
    setActiveRange(undefined);
    updateUrl("live");
  }, []);

  const handleStartHistorical = useCallback(async (hours: number) => {
    const end = new Date();
    // hours=0 means "all available" — use a very large window
    const start = hours > 0
      ? new Date(end.getTime() - hours * 60 * 60 * 1000)
      : new Date(0);
    // Scale limit with range size (5-min intervals: ~12/hr, ~288/day)
    const limit = hours > 0 ? Math.max(1000, hours * 12) : 10000;
    const speed = hours <= 24 ? 60 : 360;
    await engineRef.current?.startHistoricalPlayback(start, end, speed, limit);
    setPlaybackState((prev) => ({ ...prev, mode: "historical", speed }));
    setActiveRange(hours);
    updateUrl("historical", hours, speed);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.destroy();
      engineRef.current?.stop();
    };
  }, []);

  // Auto-start from URL params on first user gesture
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const urlParams = getUrlParams();
    if (urlParams.mode !== "historical") return;

    // Default range to "all" if not specified
    const rangeStr = urlParams.range ?? "all";
    const hours = RANGE_MAP[rangeStr] ?? Number.parseInt(rangeStr, 10);
    if (Number.isNaN(hours)) return;

    const speed = urlParams.speed ? Number.parseInt(urlParams.speed, 10) : undefined;
    const pendingRef = { hours, speed: Number.isNaN(speed ?? 0) ? undefined : speed };

    const autoStart = async () => {
      document.removeEventListener("click", autoStart);
      document.removeEventListener("keydown", autoStart);

      const synth = new AudioSynthesizer();
      await synth.initialize();
      synthRef.current = synth;

      const engine = new AudioEvolutionEngine();
      engineRef.current = engine;

      const initialReading = await engine.start(synth, (newReading, _params) => {
        setReading(newReading);
        setEvolutionCount((c) => c + 1);
        setPlaybackState(engine.getPlaybackState());
      });

      if (initialReading) {
        setReading(initialReading);
        setIsPlaying(true);
        setIsConnected(true);
        // Immediately enter historical playback
        await handleStartHistorical(pendingRef.hours);
        if (pendingRef.speed) handleSpeedChange(pendingRef.speed);
      }
    };

    document.addEventListener("click", autoStart, { once: true });
    document.addEventListener("keydown", autoStart, { once: true });

    return () => {
      document.removeEventListener("click", autoStart);
      document.removeEventListener("keydown", autoStart);
    };
  }, [handleStartHistorical, handleSpeedChange]);

  const lastUpdate = reading ? new Date(reading.timestamp) : null;

  return (
    <div className={styles.dashboard}>
      <StationInfo lastUpdate={lastUpdate} isHistorical={playbackState.mode === "historical"} />

      {!isPlaying ? (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            borderBottom: "1px solid #e5e5e5",
          }}
        >
          <button
            type="button"
            onClick={handleStart}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "16px",
              padding: "12px 32px",
              border: "2px solid #1a1a1a",
              backgroundColor: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            Listen to the Weather
          </button>
          <p
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "#999",
              fontFamily: "var(--font-body)",
            }}
          >
            {activeRange !== undefined
              ? "Click anywhere to resume playback"
              : "Streams live data from Mendocino, CA and sonifies it in real time"}
          </p>
        </div>
      ) : (
        <>
          <LiveReadings reading={reading} />

          <div className={styles.visualizerSection}>
            <FrequencyVisualizer synthesizer={synthRef.current} />
          </div>

          <Timeline
            playbackState={playbackState}
            historyCache={engineRef.current?.getHistoryCache() ?? []}
            activeRange={activeRange}
            onPlayPause={handlePlayPause}
            onSpeedChange={handleSpeedChange}
            onSeek={handleSeek}
            onGoLive={handleGoLive}
            onStartHistorical={handleStartHistorical}
          />
        </>
      )}

      <div className={styles.statusBar}>
        <span>
          <span
            className={styles.connectionDot}
            style={{
              backgroundColor: isConnected ? "#4caf50" : "#999",
            }}
          />
          {isConnected ? "CONNECTED" : "OFFLINE"}
        </span>
        {isPlaying && (
          <span>
            {evolutionCount} evolution{evolutionCount !== 1 ? "s" : ""}
          </span>
        )}
        {isPlaying && (
          <button
            type="button"
            onClick={handleStop}
            style={{
              background: "none",
              border: "none",
              color: "#999",
              cursor: "pointer",
              fontSize: "11px",
              fontFamily: "inherit",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
