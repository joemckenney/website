import { shardForBase, shardPodUrl } from "@website/utils";
import { config } from "../config.js";

/**
 * Get the upstream URL for a specific base's shard.
 *
 * When sharding is disabled (shardCount <= 1), returns the
 * standard ClusterIP service URL for backwards compatibility.
 */
export function getTablesUpstream(baseId: string): string {
  if (config.tablesShardCount <= 1) {
    return config.tablesServiceUrl;
  }

  const shard = shardForBase(baseId, config.tablesShardCount);
  return shardPodUrl(
    shard,
    config.tablesServiceHeadless,
    config.tablesServicePort,
  );
}

/**
 * Get upstream URLs for all shards (for fan-out queries).
 *
 * When sharding is disabled, returns a single-element array
 * with the standard ClusterIP URL.
 */
export function getAllTablesUpstreams(): string[] {
  if (config.tablesShardCount <= 1) {
    return [config.tablesServiceUrl];
  }

  return Array.from({ length: config.tablesShardCount }, (_, i) =>
    shardPodUrl(i, config.tablesServiceHeadless, config.tablesServicePort),
  );
}
