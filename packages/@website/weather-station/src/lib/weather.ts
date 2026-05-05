import type { WeatherReading } from "../types/weather";

// Defaults to the local gateway, which proxies /weather/* to weather-service.
// Override with setServiceUrl() to point elsewhere (e.g. weather-service direct).
const DEFAULT_SERVICE_URL = "http://localhost:3000";

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

export interface StreamHistoryCallbacks {
  onMeta: (meta: { total: number; start: string | null; end: string | null }) => void;
  onBatch: (readings: WeatherReading[]) => void;
  onDone: () => void;
  onLiveReading?: (reading: WeatherReading) => void;
  onError?: (error: Event) => void;
}

/**
 * Stream historical weather readings via SSE, then transition to live.
 * Returns a close function to abort the stream.
 */
export function streamHistory(
  start: Date,
  end: Date,
  callbacks: StreamHistoryCallbacks,
): () => void {
  const params = new URLSearchParams();
  params.set("start", start.toISOString());
  params.set("end", end.toISOString());

  const url = `${getServiceUrl()}/weather/stream/history?${params}`;
  const eventSource = new EventSource(url);

  eventSource.addEventListener("meta", (event) => {
    try {
      callbacks.onMeta(JSON.parse(event.data));
    } catch { /* ignore */ }
  });

  eventSource.addEventListener("batch", (event) => {
    try {
      const { readings } = JSON.parse(event.data);
      callbacks.onBatch(readings);
    } catch { /* ignore */ }
  });

  eventSource.addEventListener("done", () => {
    callbacks.onDone();
  });

  eventSource.addEventListener("reading", (event) => {
    try {
      const reading: WeatherReading = JSON.parse(event.data);
      callbacks.onLiveReading?.(reading);
    } catch { /* ignore */ }
  });

  eventSource.onerror = (event) => {
    callbacks.onError?.(event);
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Configure the weather service URL (call before connecting)
 */
export function setServiceUrl(url: string): void {
  if (typeof window !== "undefined") {
    (window as Record<string, unknown>).__WEATHER_SERVICE_URL = url;
  }
}
