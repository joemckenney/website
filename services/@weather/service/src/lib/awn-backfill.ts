import { prisma } from "../db/client.js";
import { config } from "../config.js";

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

export async function backfill(logger: { info: (...args: unknown[]) => void; error: (...args: unknown[]) => void; warn: (...args: unknown[]) => void }) {
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

      let storedThisPage = 0;
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
          storedThisPage++;
        } catch {
          // Skip duplicates or invalid data
        }
      }

      totalStored += storedThisPage;
      pages++;

      // Get the oldest timestamp from this page for pagination
      const oldest = readings[readings.length - 1];
      if (oldest) {
        endDate = oldest.dateutc;
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
