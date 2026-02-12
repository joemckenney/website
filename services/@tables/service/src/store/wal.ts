import { prisma } from "../db/client.js";
import type { TableEvent } from "../lib/events.js";

/**
 * Write-Ahead Log (WAL) for table mutations
 *
 * Every mutation is appended to the WAL before being applied.
 * This ensures durability - we can recover state by replaying the log.
 */
export class WAL {
  /**
   * Append an event to the write-ahead log
   * This is the durable write that survives crashes
   */
  async append(event: TableEvent): Promise<bigint> {
    const record = await prisma.tableEvent.create({
      data: {
        tableId: "tableId" in event ? event.tableId : "",
        eventType: event.type,
        payload: JSON.parse(JSON.stringify(event)),
      },
    });
    return record.id;
  }

  /**
   * Get events for a table since a specific event ID
   * Used for replaying events on service startup
   */
  async getEventsSince(
    tableId: string,
    sinceEventId: bigint = 0n,
  ): Promise<Array<{ id: bigint; payload: TableEvent; createdAt: Date }>> {
    const events = await prisma.tableEvent.findMany({
      where: {
        tableId,
        id: { gt: sinceEventId },
      },
      orderBy: { id: "asc" },
    });

    return events.map((e) => ({
      id: e.id,
      payload: e.payload as unknown as TableEvent,
      createdAt: e.createdAt,
    }));
  }

  /**
   * Get all table IDs that have events in the WAL
   * Used on startup to know which tables to restore
   */
  async getActiveTableIds(): Promise<string[]> {
    const result = await prisma.tableEvent.findMany({
      select: { tableId: true },
      distinct: ["tableId"],
    });
    return result.map((r) => r.tableId).filter((id) => id !== "");
  }

  /**
   * Get the checkpoint for a table (last successfully processed event)
   */
  async getCheckpoint(tableId: string): Promise<bigint | null> {
    const checkpoint = await prisma.tableCheckpoint.findUnique({
      where: { tableId },
    });
    return checkpoint?.lastEventId ?? null;
  }

  /**
   * Update the checkpoint for a table
   */
  async updateCheckpoint(tableId: string, lastEventId: bigint): Promise<void> {
    await prisma.tableCheckpoint.upsert({
      where: { tableId },
      update: { lastEventId, checkpointAt: new Date() },
      create: { tableId, lastEventId },
    });
  }

  /**
   * Get pending events that haven't been applied to PostgreSQL yet
   * Used by the materializer
   */
  async getPendingEvents(
    limit: number,
  ): Promise<Array<{ id: bigint; tableId: string; payload: TableEvent }>> {
    const events = await prisma.tableEvent.findMany({
      where: { appliedToPg: false },
      orderBy: { id: "asc" },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      tableId: e.tableId,
      payload: e.payload as unknown as TableEvent,
    }));
  }

  /**
   * Get pending events filtered to specific table IDs.
   * Used by the materializer when sharding is active so each pod
   * only materializes events for its own tables.
   */
  async getPendingEventsForTables(
    tableIds: string[],
    limit: number,
  ): Promise<Array<{ id: bigint; tableId: string; payload: TableEvent }>> {
    if (tableIds.length === 0) return [];

    const events = await prisma.tableEvent.findMany({
      where: {
        appliedToPg: false,
        tableId: { in: tableIds },
      },
      orderBy: { id: "asc" },
      take: limit,
    });

    return events.map((e) => ({
      id: e.id,
      tableId: e.tableId,
      payload: e.payload as unknown as TableEvent,
    }));
  }

  /**
   * Mark events as applied to PostgreSQL
   */
  async markAsApplied(eventIds: bigint[]): Promise<void> {
    await prisma.tableEvent.updateMany({
      where: { id: { in: eventIds } },
      data: { appliedToPg: true, appliedAt: new Date() },
    });
  }
}

// Singleton instance
export const wal = new WAL();
