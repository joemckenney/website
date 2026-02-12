import { hostname } from "node:os";

/**
 * Parse the StatefulSet ordinal from the pod hostname.
 * e.g. "tables-service-2" → 2
 * Falls back to 0 for non-StatefulSet environments (local dev).
 */
function parseShardIndex(): number {
  const explicit = process.env.SHARD_INDEX;
  if (explicit !== undefined) return Number(explicit);

  const match = hostname().match(/-(\d+)$/);
  return match ? Number(match[1]) : 0;
}

export const config = {
  port: Number(process.env.PORT) || 3005,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://tables:devpassword@localhost:5434/tables",
  nodeEnv: process.env.NODE_ENV || "development",
  // Materializer config - background worker for PostgreSQL sync
  materializerIntervalMs: Number(process.env.MATERIALIZER_INTERVAL_MS) || 5000,
  materializerBatchSize: Number(process.env.MATERIALIZER_BATCH_SIZE) || 100,
  // Agent runner config
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  agentModel: process.env.AGENT_MODEL || "claude-sonnet-4-20250514",
  // Sharding config
  shardIndex: parseShardIndex(),
  totalShards: Number(process.env.TOTAL_SHARDS) || 1,
};
