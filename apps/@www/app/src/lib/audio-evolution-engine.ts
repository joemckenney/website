import type { AudioParameters, WeatherData } from "../types/weather";
import type { Coordinates } from "./geolocation";
import { fetchWeatherData } from "./weather";
import { generateAudioParameters } from "./gemini";

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
    onEvolution: (params: AudioParameters, weather: WeatherData) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error",
    ) => void,
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
    this.scheduleNextEvolution(onEvolution, log);
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
    onEvolution: (params: AudioParameters, weather: WeatherData) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error",
    ) => void,
  ): void {
    if (!this.isRunning) return;

    this.evolutionTimer = window.setTimeout(async () => {
      await this.generateEvolution(onEvolution, log);
      this.scheduleNextEvolution(onEvolution, log);
    }, this.config.weatherUpdateInterval * 1000);
  }

  private async generateEvolution(
    onEvolution: (params: AudioParameters, weather: WeatherData) => Promise<void>,
    log?: (
      text: string,
      type?: "info" | "success" | "warning" | "error",
    ) => void,
  ): Promise<void> {
    if (!this.coordinates) return;

    this.generationCount++;

    try {
      // Fetch fresh weather data
      log?.(`Fetching updated weather data...`, "info");
      const newWeather = await fetchWeatherData(this.coordinates);
      this.weather = newWeather;

      // Generate new audio parameters from updated weather, evolving from current state
      log?.(
        `Evolving soundscape from weather update ${this.generationCount}...`,
        "info",
      );
      const newParams = await generateAudioParameters(newWeather, this.currentParams, undefined, log);

      // Update current state
      this.currentParams = newParams;

      // Trigger crossfade with new weather data
      await onEvolution(newParams, newWeather);

      log?.(`Weather update ${this.generationCount} complete`, "success");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      log?.(`Weather update failed: ${errorMsg}`, "error");
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
