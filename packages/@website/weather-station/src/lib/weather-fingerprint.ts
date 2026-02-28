import type { WeatherData } from "../types/weather";

export interface WeatherFingerprint {
  tempBucket: number; // round to nearest 5°F
  windBucket: number; // round to nearest 5mph
  cloudBucket: number; // 0/25/50/75/100%
  condition: string; // WMO category: clear/cloudy/rain/snow/storm
  isDay: boolean;
  pressureBucket: number; // round to nearest 10hPa
}

/**
 * Map WMO weather conditions to broad categories for fingerprinting
 */
function conditionCategory(conditions: string): string {
  const lower = conditions.toLowerCase();
  if (lower.includes("thunder")) return "storm";
  if (lower.includes("snow") || lower.includes("grains")) return "snow";
  if (
    lower.includes("rain") ||
    lower.includes("drizzle") ||
    lower.includes("shower")
  )
    return "rain";
  if (lower.includes("fog")) return "fog";
  if (
    lower.includes("cloud") ||
    lower.includes("overcast") ||
    lower.includes("partly")
  )
    return "cloudy";
  return "clear";
}

/**
 * Round to nearest bucket size
 */
function bucket(value: number, size: number): number {
  return Math.round(value / size) * size;
}

/**
 * Compute a deterministic fingerprint from weather data.
 * Same weather conditions = same fingerprint = same seed = same sound.
 */
export function computeFingerprint(weather: WeatherData): WeatherFingerprint {
  return {
    tempBucket: bucket(weather.temperature, 5),
    windBucket: bucket(weather.windSpeed, 5),
    cloudBucket: bucket(weather.cloudCover, 25),
    condition: conditionCategory(weather.conditions),
    isDay: weather.isDay === 1,
    pressureBucket: bucket(weather.pressure, 10),
  };
}

/**
 * Deterministic hash of a fingerprint to a 32-bit seed number.
 * Uses a simple string hashing approach (djb2 variant).
 */
export function fingerprintToSeed(fp: WeatherFingerprint): number {
  const str = `${fp.tempBucket}|${fp.windBucket}|${fp.cloudBucket}|${fp.condition}|${fp.isDay}|${fp.pressureBucket}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // ensure unsigned 32-bit
}

/**
 * Mulberry32 seeded PRNG. Returns a function that produces deterministic
 * pseudo-random numbers in [0, 1) from a given seed.
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Compare two fingerprints for equality
 */
export function fingerprintsEqual(
  a: WeatherFingerprint,
  b: WeatherFingerprint,
): boolean {
  return (
    a.tempBucket === b.tempBucket &&
    a.windBucket === b.windBucket &&
    a.cloudBucket === b.cloudBucket &&
    a.condition === b.condition &&
    a.isDay === b.isDay &&
    a.pressureBucket === b.pressureBucket
  );
}
