/**
 * Shard routing utilities for distributing bases across StatefulSet pods.
 *
 * Uses FNV-1a hash for fast, deterministic distribution of UUIDs.
 * Shared between the tables service (startup filtering) and gateway (request routing).
 */

const FNV_OFFSET_BASIS = 2166136261;
const FNV_PRIME = 16777619;

/**
 * FNV-1a 32-bit hash. Fast, good distribution for UUIDs, zero dependencies.
 */
function fnv1a(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Force unsigned 32-bit
  return hash >>> 0;
}

/**
 * Determine which shard owns a given baseId.
 *
 * When `totalShards` is 1, always returns 0 (backwards compatible).
 */
export function shardForBase(baseId: string, totalShards: number): number {
  if (totalShards <= 1) return 0;
  return fnv1a(baseId) % totalShards;
}

/**
 * Build the in-cluster DNS URL for a specific StatefulSet pod.
 *
 * StatefulSet pods are addressable as:
 *   `<pod-name>.<headless-service>:<port>`
 *
 * e.g. `tables-service-0.tables-service-headless:3005`
 */
export function shardPodUrl(
  index: number,
  headlessService: string,
  port: number,
): string {
  // Pod name follows the StatefulSet convention: <statefulset-name>-<ordinal>
  // The StatefulSet name matches the headless service minus the `-headless` suffix
  const statefulSetName = headlessService.replace(/-headless$/, "");
  return `http://${statefulSetName}-${index}.${headlessService}:${port}`;
}
