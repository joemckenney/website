import { config } from "../config.js";

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const window = config.rateLimit.windowMs;
  const max = config.rateLimit.maxPerWindow;

  const prior = buckets.get(userId) ?? [];
  const recent = prior.filter((t) => now - t < window);

  if (recent.length >= max) {
    return { ok: false, retryAfterMs: window - (now - recent[0]) };
  }

  recent.push(now);
  buckets.set(userId, recent);
  return { ok: true };
}
