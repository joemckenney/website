import type { AudioParameters, PlaybackState, WeatherReading } from "../types/weather";
import type { AudioSynthesizer } from "./audio-synthesizer";
import { evolveParameters, generateAudioParameters } from "./sound-engine";
import { connectStream, fetchCurrent, streamHistory } from "./weather";

export interface LoadingProgress {
  loaded: number;
  total: number;
  done: boolean;
}

export type EvolutionCallback = (
  reading: WeatherReading,
  params: AudioParameters,
) => void;

export type LoadingProgressCallback = (progress: LoadingProgress) => void;

export class AudioEvolutionEngine {
  private synthesizer: AudioSynthesizer | null = null;
  private currentReading: WeatherReading | null = null;
  private currentParams: AudioParameters | null = null;
  private disconnectStream: (() => void) | null = null;
  private playbackTimer: number | null = null;
  private isRunning = false;
  private evolutionCount = 0;
  private onEvolution: EvolutionCallback | null = null;
  private onLoadingProgress: LoadingProgressCallback | null = null;

  private playbackState: PlaybackState = {
    mode: "live",
    speed: 1,
    cursor: new Date(),
    isPlaying: true,
  };

  // History cache for scrubbing
  private historyCache: WeatherReading[] = [];
  private historyCursor = 0;
  private loadingProgress: LoadingProgress = { loaded: 0, total: 0, done: true };
  // Resolves when the next batch arrives (used when playback outruns loading)
  private batchWaiter: (() => void) | null = null;

  async start(
    synthesizer: AudioSynthesizer,
    onEvolution?: EvolutionCallback,
    onLoadingProgress?: LoadingProgressCallback,
  ): Promise<WeatherReading | null> {
    if (this.isRunning) return this.currentReading;

    this.synthesizer = synthesizer;
    this.onEvolution = onEvolution ?? null;
    this.onLoadingProgress = onLoadingProgress ?? null;
    this.isRunning = true;
    this.evolutionCount = 0;

    // Fetch initial reading
    try {
      const reading = await fetchCurrent();
      this.currentReading = reading;
      this.currentParams = generateAudioParameters(reading);

      await synthesizer.start(this.currentParams);
      this.onEvolution?.(reading, this.currentParams);

      // Connect to live SSE stream
      this.connectLiveStream();

      return reading;
    } catch (err) {
      console.error("Failed to start evolution engine:", err);
      this.isRunning = false;
      return null;
    }
  }

  stop(): void {
    this.disconnectStream?.();
    this.disconnectStream = null;

    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    // Wake any waiting playback loop so it can exit cleanly
    this.batchWaiter?.();
    this.batchWaiter = null;

    this.isRunning = false;
    this.synthesizer = null;
    this.onEvolution = null;
    this.onLoadingProgress = null;
  }

  private connectLiveStream(): void {
    this.disconnectStream?.();
    this.playbackState.mode = "live";

    this.disconnectStream = connectStream(
      (reading) => {
        if (!this.isRunning || !this.synthesizer || this.playbackState.mode !== "live") return;

        const prevReading = this.currentReading;
        this.currentReading = reading;
        this.playbackState.cursor = new Date(reading.timestamp);

        if (prevReading && this.currentParams) {
          // Smooth evolution from previous reading
          this.currentParams = evolveParameters(this.currentParams, prevReading, reading);
          this.synthesizer.updateParameters(this.currentParams, 10);
        } else {
          // First reading or no previous params — generate fresh
          this.currentParams = generateAudioParameters(reading);
          this.synthesizer.crossfade(this.currentParams, 5);
        }

        this.evolutionCount++;
        this.onEvolution?.(reading, this.currentParams);
      },
      (error) => {
        console.error("SSE stream error:", error);
      },
    );
  }

  /**
   * Switch to historical playback mode via SSE streaming
   */
  startHistoricalPlayback(
    start: Date,
    end: Date,
    speed = 1,
  ): void {
    if (!this.isRunning || !this.synthesizer) return;

    // Pause live stream / previous history stream
    this.disconnectStream?.();
    this.disconnectStream = null;

    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    // Reset history state
    this.historyCache = [];
    this.historyCursor = 0;
    this.loadingProgress = { loaded: 0, total: 0, done: false };
    this.onLoadingProgress?.(this.loadingProgress);

    this.playbackState = {
      mode: "historical",
      speed,
      cursor: start,
      isPlaying: true,
    };

    let firstBatchReceived = false;

    this.disconnectStream = streamHistory(start, end, {
      onMeta: (meta) => {
        this.loadingProgress = { loaded: 0, total: meta.total, done: false };
        this.onLoadingProgress?.(this.loadingProgress);
      },

      onBatch: (readings) => {
        // Append to cache — batches arrive in chronological order
        this.historyCache.push(...readings);
        this.loadingProgress = {
          ...this.loadingProgress,
          loaded: this.historyCache.length,
        };
        this.onLoadingProgress?.(this.loadingProgress);

        // Wake playback loop if it was waiting for data
        this.batchWaiter?.();
        this.batchWaiter = null;

        // Start playback on first batch
        if (!firstBatchReceived) {
          firstBatchReceived = true;
          this.playbackState.cursor = new Date(this.historyCache[0].timestamp);
          this.startPlaybackLoop();
        }
      },

      onDone: () => {
        this.loadingProgress = { ...this.loadingProgress, done: true };
        this.onLoadingProgress?.(this.loadingProgress);
        // Wake playback if waiting — it will see done=true and handle end-of-data
        this.batchWaiter?.();
        this.batchWaiter = null;
      },

      onLiveReading: (reading) => {
        // After history is done and playback has reached the end, auto-transition handled
        // by playback loop. But we can also forward live readings here if already transitioned.
        if (this.playbackState.mode === "live" && this.isRunning && this.synthesizer) {
          const prevReading = this.currentReading;
          this.currentReading = reading;
          this.playbackState.cursor = new Date(reading.timestamp);

          if (prevReading && this.currentParams) {
            this.currentParams = evolveParameters(this.currentParams, prevReading, reading);
            this.synthesizer.updateParameters(this.currentParams, 10);
          } else {
            this.currentParams = generateAudioParameters(reading);
            this.synthesizer.crossfade(this.currentParams, 5);
          }

          this.evolutionCount++;
          this.onEvolution?.(reading, this.currentParams);
        }
      },

      onError: (error) => {
        console.error("History SSE stream error:", error);
      },
    });
  }

  private startPlaybackLoop(): void {
    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
    }

    // AWN reports every ~5 minutes = 300s
    // At 1x speed, advance every 300s
    // At 60x, advance every 5s
    // At 360x, advance every ~0.83s
    const intervalMs = Math.max(100, (300 / this.playbackState.speed) * 1000);

    this.playbackTimer = window.setInterval(() => {
      if (!this.playbackState.isPlaying || !this.synthesizer) return;

      this.historyCursor++;

      if (this.historyCursor >= this.historyCache.length) {
        if (this.loadingProgress.done) {
          // All data loaded and we've reached the end — transition to live
          this.playbackState.mode = "live";
          this.playbackState.isPlaying = true;
          if (this.playbackTimer !== null) {
            clearInterval(this.playbackTimer);
            this.playbackTimer = null;
          }
          // The SSE connection is still open and will send live readings
          // via the onLiveReading callback
          this.onEvolution?.(
            this.currentReading!,
            this.currentParams!,
          );
          return;
        }
        // Still loading — back up cursor and wait for next batch
        this.historyCursor = this.historyCache.length - 1;
        return;
      }

      const reading = this.historyCache[this.historyCursor];
      const prevReading = this.currentReading;
      this.currentReading = reading;
      this.playbackState.cursor = new Date(reading.timestamp);

      if (prevReading && this.currentParams) {
        this.currentParams = evolveParameters(this.currentParams, prevReading, reading);

        // Faster ramp for faster playback
        const rampDuration = Math.max(0.5, 5 / this.playbackState.speed);
        this.synthesizer.updateParameters(this.currentParams, rampDuration);
      } else {
        this.currentParams = generateAudioParameters(reading);
        this.synthesizer.crossfade(this.currentParams, 2);
      }

      this.evolutionCount++;
      this.onEvolution?.(reading, this.currentParams);
    }, intervalMs);
  }

  /**
   * Resume live streaming mode
   */
  async resumeLive(): Promise<void> {
    // Close any existing stream (including history SSE)
    this.disconnectStream?.();
    this.disconnectStream = null;

    if (this.playbackTimer !== null) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    this.playbackState.mode = "live";
    this.playbackState.isPlaying = true;

    // Fetch current reading immediately so UI updates without waiting for next SSE event
    try {
      const reading = await fetchCurrent();
      this.currentReading = reading;
      this.playbackState.cursor = new Date(reading.timestamp);
      this.currentParams = generateAudioParameters(reading);
      this.synthesizer?.crossfade(this.currentParams, 2);
      this.onEvolution?.(reading, this.currentParams);
    } catch {
      // Fall through to SSE — next event will update
    }

    this.connectLiveStream();
  }

  /**
   * Seek to a specific position in the history cache
   */
  seekTo(timestamp: Date): void {
    if (this.playbackState.mode !== "historical" || this.historyCache.length === 0) return;

    const targetTime = timestamp.getTime();
    let closest = 0;
    let closestDiff = Infinity;

    for (let i = 0; i < this.historyCache.length; i++) {
      const diff = Math.abs(new Date(this.historyCache[i].timestamp).getTime() - targetTime);
      if (diff < closestDiff) {
        closestDiff = diff;
        closest = i;
      }
    }

    this.historyCursor = closest;
    const reading = this.historyCache[closest];
    this.currentReading = reading;
    this.playbackState.cursor = new Date(reading.timestamp);

    // Generate fresh params for the seeked position
    this.currentParams = generateAudioParameters(reading);
    this.synthesizer?.crossfade(this.currentParams, 1);
    this.onEvolution?.(reading, this.currentParams);
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackState.speed = speed;
    if (this.playbackState.mode === "historical" && this.playbackTimer !== null) {
      this.startPlaybackLoop(); // restart with new interval
    }
  }

  async togglePlayPause(): Promise<void> {
    this.playbackState.isPlaying = !this.playbackState.isPlaying;
    if (this.synthesizer) {
      if (this.playbackState.isPlaying) {
        await this.synthesizer.resume();
      } else {
        await this.synthesizer.suspend();
      }
    }
  }

  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getEvolutionCount(): number {
    return this.evolutionCount;
  }

  getCurrentReading(): WeatherReading | null {
    return this.currentReading;
  }

  getHistoryCache(): WeatherReading[] {
    return this.historyCache;
  }

  getLoadingProgress(): LoadingProgress {
    return { ...this.loadingProgress };
  }
}
