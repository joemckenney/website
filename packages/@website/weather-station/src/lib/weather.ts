import type { WeatherReading } from "../types/weather";

const DEFAULT_SERVICE_URL = "http://localhost:3004";

function getServiceUrl(): string {
  // In browser context, check for env variable or use default
  if (typeof window !== "undefined") {
    return (window as Record<string, unknown>).__WEATHER_SERVICE_URL as string || DEFAULT_SERVICE_URL;
  }
  return DEFAULT_SERVICE_URL;
}

export type ReadingCallback = (reading: WeatherReading) => void;

/**
 * Connect to the weather service SSE stream for real-time readings
 */
export function connectStream(
  onReading: ReadingCallback,
  onError?: (error: Event) => void,
): () => void {
  const url = `${getServiceUrl()}/weather/stream`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const reading: WeatherReading = JSON.parse(event.data);
      onReading(reading);
    } catch {
      // Ignore parse errors (e.g., heartbeat comments)
    }
  };

  eventSource.onerror = (event) => {
    onError?.(event);
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Fetch the most recent weather reading
 */
export async function fetchCurrent(): Promise<WeatherReading> {
  const res = await fetch(`${getServiceUrl()}/weather/current`);
  if (!res.ok) {
    throw new Error(`Failed to fetch current weather: ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch historical weather readings within a time range
 */
export async function fetchHistory(
  start?: Date,
  end?: Date,
  limit = 100,
): Promise<WeatherReading[]> {
  const params = new URLSearchParams();
  if (start) params.set("start", start.toISOString());
  if (end) params.set("end", end.toISOString());
  params.set("limit", String(limit));

  const res = await fetch(
    `${getServiceUrl()}/weather/history?${params}`,
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch weather history: ${res.status}`);
  }
  return res.json();
}

/**
 * Configure the weather service URL (call before connecting)
 */
export function setServiceUrl(url: string): void {
  if (typeof window !== "undefined") {
    (window as Record<string, unknown>).__WEATHER_SERVICE_URL = url;
  }
}
