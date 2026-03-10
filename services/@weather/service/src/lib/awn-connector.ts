import { io, type Socket } from "socket.io-client";
import { prisma } from "../db/client.js";
import { config } from "../config.js";

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

export function startConnector(logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void }) {
  if (!config.awnApiKey || !config.awnAppKey) {
    logger.warn("AWN_API_KEY or AWN_APP_KEY not set — skipping real-time connector");
    return;
  }

  socket = io(AWN_REALTIME_URL, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 30000,
  });

  socket.on("connect", () => {
    logger.info("Connected to AWN real-time endpoint");
    socket?.emit("subscribe", { apiKeys: [config.awnApiKey] });
  });

  socket.on("subscribed", (data: unknown) => {
    logger.info({ data }, "Subscribed to AWN data stream");
  });

  socket.on("data", async (data: Record<string, unknown>) => {
    const macAddress = data.macAddress as string | undefined;
    if (macAddress !== config.awnMacAddress) return;

    try {
      const fields = extractReading(data);
      const reading = await prisma.weatherReading.upsert({
        where: { timestamp: fields.timestamp },
        create: fields,
        update: fields,
      });

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
}

export function stopConnector() {
  socket?.disconnect();
  socket = null;
  listeners.clear();
}
