import { config } from "../config.js";

/**
 * LRU cache for tableId → baseId mappings.
 *
 * On cache miss, queries the tables service ClusterIP (any pod can
 * answer since it reads from shared PostgreSQL). The mapping is
 * immutable (a table never changes base), so entries are safe to
 * cache indefinitely.
 */
class TableBaseCache {
  private cache = new Map<string, string>();
  private maxSize = 10_000;

  /**
   * Resolve the baseId for a given tableId.
   * Returns from cache if available, otherwise fetches from tables service.
   */
  async resolve(tableId: string): Promise<string | null> {
    const cached = this.cache.get(tableId);
    if (cached) {
      // Move to end for LRU ordering
      this.cache.delete(tableId);
      this.cache.set(tableId, cached);
      return cached;
    }

    // Fetch from tables service ClusterIP (any pod can answer)
    try {
      const res = await fetch(
        `${config.tablesServiceUrl}/internal/table-base/${tableId}`,
      );
      if (!res.ok) return null;

      const data = (await res.json()) as { tableId: string; baseId: string };
      this.set(tableId, data.baseId);
      return data.baseId;
    } catch {
      return null;
    }
  }

  /**
   * Manually set a cache entry (e.g. after creating a table).
   */
  set(tableId: string, baseId: string): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(tableId, baseId);
  }
}

export const tableBaseCache = new TableBaseCache();
