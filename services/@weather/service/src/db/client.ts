import { createPrismaClient } from "@weather/db";

export const prisma = createPrismaClient();

export function serializeReading(reading: {
  id: string;
  timestamp: Date;
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
  raw?: unknown;
}) {
  // Destructure out `raw` to avoid leaking full AWN payload
  const { raw: _, ...rest } = reading;
  return {
    ...rest,
    timestamp: reading.timestamp.toISOString(),
  };
}
