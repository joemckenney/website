import type { AudioParameters, WeatherData } from "../types/weather";
import type { Coordinates } from "./geolocation";
import { fetchWeatherData } from "./weather";
import { generateAudioParameters } from "./gemini";
import { compareWeather, type WeatherChange } from "./weather-diff";

export interface EvolutionConfig {
  weatherUpdateInterval: number; // How often to fetch new weather data (60 seconds = 1 minute)
  crossfadeDuration: number; // Crossfade duration in seconds (5-10 recommended)
}

export class AudioEvolutionEngine {
  private coordinates: Coordinates | null = null;
  private weather: WeatherData | null = null;
  private currentParams: AudioParameters | null = null;
  private evolutionTimer: number | null = null;
  private isRunning = false;
  private config: EvolutionConfig;
  private generationCount = 0;

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
    onEvolution: (params: AudioParameters, weather: WeatherData, changes: WeatherChange[]) => Promise<void>,
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
    this.isRunning = true;
    this.generationCount = 0;

    log?.(
      `Weather-driven evolution started (update interval: ${this.config.weatherUpdateInterval}s)`,
      "info",
    );

    // Schedule first evolution
    this.scheduleNextEvolution(onEvolution, log, updateLog, removeLog);
  }

  /**
   * Stop the evolution loop
   */
  stop(): void {
    if (this.evolutionTimer !== null) {
      clearTimeout(this.evolutionTimer);
      this.evolutionTimer = null;
    }
    this.isRunning = false;
    this.coordinates = null;
  }

  private scheduleNextEvolution(
    onEvolution: (params: AudioParameters, weather: WeatherData, changes: WeatherChange[]) => Promise<void>,
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
    onEvolution: (params: AudioParameters, weather: WeatherData, changes: WeatherChange[]) => Promise<void>,
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
    if (!this.coordinates || !this.weather) return;

    this.generationCount++;

    try {
      // On first check, add the detecting line
      if (this.generationCount === 1) {
        log?.("Detecting changes in weather.", "info");
      } else {
        // Update the detecting line with animated dots
        const dots = ".".repeat((this.generationCount % 3) + 1);
        updateLog?.(`Detecting changes in weather${dots}`, "info");
      }

      // Fetch fresh weather data
      const newWeather = await fetchWeatherData(this.coordinates);

      // Compare with previous weather to detect changes
      const changes = compareWeather(this.weather, newWeather);

      if (changes.length === 0) {
        // No significant weather changes, keep the detecting line
        return;
      }

      // Weather has changed - remove the detecting line and log what changed
      removeLog?.();
      log?.(`Weather changed (${changes.length} parameter${changes.length > 1 ? 's' : ''})`, "info");
      for (const change of changes) {
        log?.(change.description, "output");
      }

      // Generate new audio parameters from updated weather, evolving from current state
      log?.(`Updating soundscape...`, "info");
      const newParams = await generateAudioParameters(newWeather, this.currentParams, undefined, log);

      // Update current state
      this.currentParams = newParams;
      this.weather = newWeather;

      // Trigger crossfade with new weather data and changes
      await onEvolution(newParams, newWeather, changes);

      log?.(`Soundscape updated`, "success");

      // Reset generation count and add new detecting line
      this.generationCount = 0;
      log?.("Detecting changes in weather.", "info");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      removeLog?.(); // Remove detecting line on error
      log?.(`Weather update failed: ${errorMsg}`, "error");
      // Add detecting line back
      log?.("Detecting changes in weather.", "info");
    }
  }


  getIsRunning(): boolean {
    return this.isRunning;
  }

  getGenerationCount(): number {
    return this.generationCount;
  }

  updateConfig(config: Partial<EvolutionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
