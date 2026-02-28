import type { AudioParameters, WeatherData } from "../types/weather";
import type { AudioSynthesizer } from "./audio-synthesizer";
import type { Coordinates } from "./geolocation";
import {
  generateAudioParameters,
  evolveParameters,
} from "./sound-engine";
import { fetchWeatherData } from "./weather";
import { compareWeather, type WeatherChange } from "./weather-diff";
import {
  computeFingerprint,
  fingerprintToSeed,
  fingerprintsEqual,
  type WeatherFingerprint,
} from "./weather-fingerprint";

export interface EvolutionConfig {
  weatherUpdateInterval: number; // seconds between weather fetches
  crossfadeDuration: number; // crossfade duration in seconds
}

export class AudioEvolutionEngine {
  private coordinates: Coordinates | null = null;
  private weather: WeatherData | null = null;
  private currentParams: AudioParameters | null = null;
  private fingerprint: WeatherFingerprint | null = null;
  private synthesizer: AudioSynthesizer | null = null;
  private evolutionTimer: number | null = null;
  private isRunning = false;
  private config: EvolutionConfig;
  private generationCount = 0;
  private evolutionCount = 0;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  /**
   * Start the continuous weather-driven evolution loop
   */
  async start(
    coordinates: Coordinates,
    initialWeather: WeatherData,
    initialParams: AudioParameters,
    synthesizer: AudioSynthesizer,
    onEvolution: (
      params: AudioParameters,
      weather: WeatherData,
      changes: WeatherChange[],
    ) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    updateLog?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    removeLog?: () => void,
  ): Promise<void> {
    if (this.isRunning) {
      log?.("Evolution already running", "warning");
      return;
    }

    this.coordinates = coordinates;
    this.weather = initialWeather;
    this.currentParams = initialParams;
    this.fingerprint = computeFingerprint(initialWeather);
    this.synthesizer = synthesizer;
    this.isRunning = true;
    this.generationCount = 0;
    this.evolutionCount = 0;

    log?.(
      `Weather-driven evolution started (update interval: ${this.config.weatherUpdateInterval}s)`,
      "info",
    );

    this.scheduleNextEvolution(onEvolution, log, updateLog, removeLog);
  }

  stop(): void {
    if (this.evolutionTimer !== null) {
      clearTimeout(this.evolutionTimer);
      this.evolutionTimer = null;
    }
    this.isRunning = false;
    this.coordinates = null;
    this.synthesizer = null;
  }

  private scheduleNextEvolution(
    onEvolution: (
      params: AudioParameters,
      weather: WeatherData,
      changes: WeatherChange[],
    ) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    updateLog?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    removeLog?: () => void,
  ): void {
    if (!this.isRunning) return;

    this.evolutionTimer = window.setTimeout(async () => {
      await this.generateEvolution(onEvolution, log, updateLog, removeLog);
      this.scheduleNextEvolution(onEvolution, log, updateLog, removeLog);
    }, this.config.weatherUpdateInterval * 1000);
  }

  private async generateEvolution(
    onEvolution: (
      params: AudioParameters,
      weather: WeatherData,
      changes: WeatherChange[],
    ) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    updateLog?: (
      text: string,
      type?: "info" | "success" | "warning" | "error" | "output",
    ) => void,
    removeLog?: () => void,
  ): Promise<void> {
    if (!this.coordinates || !this.weather || !this.currentParams) return;

    this.generationCount++;

    try {
      const dots = ".".repeat((this.generationCount % 3) + 1);
      updateLog?.(`Detecting changes in weather${dots}`, "info");

      // Fetch fresh weather data
      const newWeather = await fetchWeatherData(this.coordinates);

      // Compare with previous weather to detect changes
      const changes = compareWeather(this.weather, newWeather);

      if (changes.length === 0) {
        // No significant weather changes
        return;
      }

      // Weather has changed
      removeLog?.();
      log?.(
        `Weather changed (${changes.length} parameter${changes.length > 1 ? "s" : ""})`,
        "info",
      );
      for (const change of changes) {
        log?.(change.description, "output");
      }

      // Check if fingerprint changed (major shift) or just values (minor drift)
      const newFingerprint = computeFingerprint(newWeather);
      const fingerprintChanged =
        !this.fingerprint ||
        !fingerprintsEqual(this.fingerprint, newFingerprint);

      let newParams: AudioParameters;

      if (fingerprintChanged) {
        // Major weather shift — generate fresh params and crossfade
        const newSeed = fingerprintToSeed(newFingerprint);
        newParams = generateAudioParameters(newWeather, newSeed);
        log?.("Major weather shift — crossfading to new soundscape...", "info");

        this.fingerprint = newFingerprint;
        this.currentParams = newParams;
        this.weather = newWeather;
        this.evolutionCount++;

        // Trigger full crossfade via callback
        await onEvolution(newParams, newWeather, changes);
      } else {
        // Minor drift — evolve in place with smooth ramping
        newParams = evolveParameters(
          this.currentParams,
          this.weather,
          newWeather,
        );
        log?.("Evolving soundscape...", "info");

        this.currentParams = newParams;
        this.weather = newWeather;
        this.evolutionCount++;

        // Smooth in-place ramp (no oscillator teardown)
        if (this.synthesizer) {
          this.synthesizer.updateParameters(newParams, 10);
        }
      }

      log?.("Soundscape updated", "success");

      this.generationCount = 0;
      log?.("Detecting changes in weather.", "info");
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      removeLog?.();
      log?.(`Weather update failed: ${errorMsg}`, "error");
      log?.("Detecting changes in weather.", "info");
    }
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getGenerationCount(): number {
    return this.generationCount;
  }

  getEvolutionCount(): number {
    return this.evolutionCount;
  }

  getFingerprint(): WeatherFingerprint | null {
    return this.fingerprint;
  }

  updateConfig(config: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
