import { io, type Socket } from "socket.io-client";
import { config } from "../config.js";
import { prisma } from "../db/client.js";

const AWN_REALTIME_URL = "https://rt2.ambientweather.net";

export type ReadingCallback = (reading: SerializedReading) => void;

interface SerializedReading {
  id: string;
  timestamp: string;
  tempf: number;
  humidity: number;
  windspeedmph: number;
  windgustmph: number;
  maxdailygust: number;
  winddir: number;
  winddir_avg10m: number;
  uv: number;
  solarradiation: number;
  hourlyrainin: number;
  dailyrainin: number;
  baromrelin: number;
  baromabsin: number;
  tempinf: number;
  humidityin: number;
  feelsLike: number;
  dewPoint: number;
}

const listeners = new Set<ReadingCallback>();

export function onReading(callback: ReadingCallback) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function broadcast(reading: SerializedReading) {
  for (const listener of listeners) {
    listener(reading);
  }
}

function extractReading(data: Record<string, unknown>) {
  return {
    timestamp: new Date(data.dateutc as number),
    tempf: Number(data.tempf ?? 0),
    humidity: Number(data.humidity ?? 0),
    windspeedmph: Number(data.windspeedmph ?? 0),
    windgustmph: Number(data.windgustmph ?? 0),
    maxdailygust: Number(data.maxdailygust ?? 0),
    winddir: Number(data.winddir ?? 0),
    winddir_avg10m: Number(data.winddir_avg10m ?? 0),
    uv: Number(data.uv ?? 0),
    solarradiation: Number(data.solarradiation ?? 0),
    hourlyrainin: Number(data.hourlyrainin ?? 0),
    dailyrainin: Number(data.dailyrainin ?? 0),
    baromrelin: Number(data.baromrelin ?? 0),
    baromabsin: Number(data.baromabsin ?? 0),
    tempinf: Number(data.tempinf ?? 0),
    humidityin: Number(data.humidityin ?? 0),
    feelsLike: Number(data.feelsLike ?? 0),
    dewPoint: Number(data.dewPoint ?? 0),
    raw: data as object,
  };
}

let socket: Socket | null = null;
let watchdog: ReturnType<typeof setTimeout> | null = null;
let statusInterval: ReturnType<typeof setInterval> | null = null;
let lastDataAt: number = 0;
let readingsSinceRestart = 0;

// If no data arrives within this window, force a reconnect.
// The station reports every ~5 minutes; 10 minutes gives a comfortable margin.
const STALE_THRESHOLD_MS = 10 * 60 * 1000;

function resetWatchdog(logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}) {
  if (watchdog) clearTimeout(watchdog);
  watchdog = setTimeout(() => {
    logger.warn(
      {
        lastDataAt: new Date(lastDataAt).toISOString(),
        silentMinutes: Math.round((Date.now() - lastDataAt) / 60000),
      },
      "No AWN data received within threshold — forcing reconnect",
    );
    reconnect(logger);
  }, STALE_THRESHOLD_MS);
}

function reconnect(logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}) {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  readingsSinceRestart = 0;

  // Brief delay before reconnecting to avoid tight loops
  setTimeout(() => startConnector(logger), 5000);
}

export function startConnector(logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}) {
  if (!config.awnApiKey || !config.awnAppKey) {
    logger.warn(
      "AWN_API_KEY or AWN_APP_KEY not set — skipping real-time connector",
    );
    return;
  }

  socket = io(`${AWN_REALTIME_URL}/?api=1&applicationKey=${config.awnAppKey}`, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
  });

  socket.on("connect", () => {
    logger.info("Connected to AWN real-time endpoint");
    socket?.emit("subscribe", { apiKeys: [config.awnApiKey] });
    resetWatchdog(logger);
  });

  socket.on("subscribed", (data: unknown) => {
    logger.info({ data }, "Subscribed to AWN data stream");
  });

  socket.on("data", async (data: Record<string, unknown>) => {
    const macAddress = data.macAddress as string | undefined;
    if (macAddress !== config.awnMacAddress) return;

    lastDataAt = Date.now();
    resetWatchdog(logger);

    try {
      const fields = extractReading(data);
      const reading = await prisma.weatherReading.upsert({
        where: { timestamp: fields.timestamp },
        create: fields,
        update: fields,
      });

      readingsSinceRestart++;
      logger.info({ timestamp: reading.timestamp }, "Stored weather reading");
      broadcast({
        ...reading,
        timestamp: reading.timestamp.toISOString(),
      });
    } catch (err) {
      logger.error({ err }, "Failed to store weather reading");
    }
  });

  socket.on("disconnect", (reason: string) => {
    logger.warn({ reason }, "Disconnected from AWN");
  });

  socket.on("connect_error", (err: Error) => {
    logger.error({ err: err.message }, "AWN connection error");
  });

  // Log connector status every 5 minutes for observability
  statusInterval = setInterval(
    () => {
      const silentMinutes = lastDataAt
        ? Math.round((Date.now() - lastDataAt) / 60000)
        : -1;
      logger.info(
        {
          connected: socket?.connected ?? false,
          readingsSinceRestart,
          lastDataAt: lastDataAt ? new Date(lastDataAt).toISOString() : "never",
          silentMinutes,
        },
        "AWN connector status",
      );
    },
    5 * 60 * 1000,
  );
}

export function stopConnector() {
  if (watchdog) {
    clearTimeout(watchdog);
    watchdog = null;
  }
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  socket?.disconnect();
  socket = null;
  listeners.clear();
}
