import { config } from "../config.js";
import { prisma } from "../db/client.js";

const AWN_API_BASE = "https://rt.ambientweather.net/v1";

interface AwnApiReading {
  dateutc: number;
  [key: string]: unknown;
}

async function fetchPage(endDate?: number): Promise<AwnApiReading[]> {
  const params = new URLSearchParams({
    apiKey: config.awnApiKey,
    applicationKey: config.awnAppKey,
    limit: "288",
  });
  if (endDate) {
    params.set("endDate", String(endDate));
  }

  const url = `${AWN_API_BASE}/devices/${config.awnMacAddress}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`AWN API error: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as AwnApiReading[];
}

/**
 * Full historical backfill — pages backward from now until no more data.
 * Used at startup to populate the database.
 */
export async function backfill(logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}) {
  if (!config.awnApiKey || !config.awnAppKey) {
    logger.warn("AWN_API_KEY or AWN_APP_KEY not set — skipping backfill");
    return;
  }

  logger.info("Starting AWN historical backfill");

  let totalStored = 0;
  let endDate: number | undefined;
  let pages = 0;

  while (true) {
    try {
      const readings = await fetchPage(endDate);
      if (readings.length === 0) break;

      const storedThisPage = await storeReadings(readings);

      totalStored += storedThisPage;
      pages++;

      // Get the oldest timestamp from this page for pagination
      const oldest = readings[readings.length - 1];
      if (oldest) {
        endDate = oldest.dateutc - 1;
      }

      logger.info(
        { page: pages, stored: storedThisPage, total: totalStored },
        "Backfill page complete",
      );

      // Rate limit: AWN allows 1 request per second
      await new Promise((resolve) => setTimeout(resolve, 1100));
    } catch (err) {
      logger.error({ err }, "Backfill page failed");
      break;
    }
  }

  logger.info({ totalStored }, "AWN backfill complete");
}

/**
 * Gap-fill — fetches recent data from the AWN API to fill any gaps
 * left by real-time connector downtime. Fetches from the most recent
 * DB reading forward to now.
 */
export async function gapFill(logger: {
  info: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
}) {
  if (!config.awnApiKey || !config.awnAppKey) {
    return;
  }

  const latest = await prisma.weatherReading.findFirst({
    orderBy: { timestamp: "desc" },
    select: { timestamp: true },
  });

  if (!latest) {
    logger.info("No existing readings — running full backfill for gap-fill");
    return backfill(logger);
  }

  const gapMs = Date.now() - latest.timestamp.getTime();
  const gapMinutes = Math.round(gapMs / 60000);

  // Only gap-fill if there's actually a gap (>10 minutes since last reading)
  if (gapMinutes <= 10) {
    return;
  }

  logger.info(
    { gapMinutes, since: latest.timestamp.toISOString() },
    "Starting AWN gap-fill",
  );

  let totalStored = 0;
  let endDate: number | undefined;
  const stopAt = latest.timestamp.getTime();

  while (true) {
    try {
      const readings = await fetchPage(endDate);
      if (readings.length === 0) break;

      const storedThisPage = await storeReadings(readings);
      totalStored += storedThisPage;

      // The oldest reading on this page — if it's older than our last DB entry, we're done
      const oldest = readings[readings.length - 1];
      if (oldest && oldest.dateutc <= stopAt) break;

      if (oldest) {
        endDate = oldest.dateutc - 1;
      }

      await new Promise((resolve) => setTimeout(resolve, 1100));
    } catch (err) {
      logger.error({ err }, "Gap-fill page failed");
      break;
    }
  }

  logger.info({ totalStored, gapMinutes }, "AWN gap-fill complete");
}

async function storeReadings(readings: AwnApiReading[]): Promise<number> {
  let stored = 0;
  for (const data of readings) {
    const timestamp = new Date(data.dateutc);
    try {
      await prisma.weatherReading.upsert({
        where: { timestamp },
        create: {
          timestamp,
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
        },
        update: {},
      });
      stored++;
    } catch {
      // Skip duplicates or invalid data
    }
  }
  return stored;
}
