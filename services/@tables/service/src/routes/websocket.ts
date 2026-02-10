import type { WebSocket } from "@fastify/websocket";
import type { FastifyInstance } from "fastify";
import { prisma } from "../db/client.js";
import type { TableEvent } from "../lib/events.js";
import {
  type ClientMessage,
  isValidClientMessage,
  type ServerMessage,
  serverMessage,
} from "../lib/ws-protocol.js";
import { memoryStore } from "../store/memory.js";

/**
 * Connection info for a WebSocket client
 */
interface ConnectionInfo {
  socket: WebSocket;
  userId: string;
  tableId: string;
}

/**
 * Connection pool: tableId -> Set of connections
 */
const tableConnections = new Map<string, Set<ConnectionInfo>>();

/**
 * Active subscriptions to memoryStore: tableId -> unsubscribe function
 */
const tableSubscriptions = new Map<string, () => void>();

/**
 * Send a typed message to a WebSocket
 */
function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast an event to all connections for a table
 * Called by memoryStore subscription when any event is applied
 */
function broadcastEvent(tableId: string, event: TableEvent): void {
  const connections = tableConnections.get(tableId);
  if (!connections || connections.size === 0) return;

  // Use "server" as originUserId so clients know to process the event
  const msg = serverMessage.event(event, "server");
  const data = JSON.stringify(msg);

  for (const conn of connections) {
    if (conn.socket.readyState === 1) {
      conn.socket.send(data);
    }
  }
}

/**
 * Get connection count for a table (useful for debugging)
 */
export function getConnectionCount(tableId: string): number {
  return tableConnections.get(tableId)?.size ?? 0;
}

/**
 * Subscribe to memoryStore events for a table (if not already subscribed)
 */
function ensureTableSubscription(tableId: string): void {
  if (tableSubscriptions.has(tableId)) return;

  const unsubscribe = memoryStore.subscribe(tableId, (event) => {
    broadcastEvent(tableId, event);
  });

  tableSubscriptions.set(tableId, unsubscribe);
}

/**
 * Unsubscribe from memoryStore events if no more connections
 */
function cleanupTableSubscription(tableId: string): void {
  const connections = tableConnections.get(tableId);
  if (connections && connections.size > 0) return;

  const unsubscribe = tableSubscriptions.get(tableId);
  if (unsubscribe) {
    unsubscribe();
    tableSubscriptions.delete(tableId);
  }
}

/**
 * Register WebSocket routes for real-time table updates
 */
export async function registerWebSocketRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.get("/ws/:tableId", { websocket: true }, (socket: WebSocket, req) => {
    const { tableId } = req.params as { tableId: string };
    const userId = req.headers["x-user-id"] as string | undefined;

    // Validate user context (should be set by gateway proxy)
    if (!userId) {
      send(socket, serverMessage.error("UNAUTHORIZED", "Missing user context"));
      socket.close(1008, "Unauthorized");
      return;
    }

    // Check if table exists
    if (!memoryStore.hasTable(tableId)) {
      send(socket, serverMessage.error("NOT_FOUND", "Table not found"));
      socket.close(1008, "Table not found");
      return;
    }

    // Create connection info
    const connInfo: ConnectionInfo = { socket, userId, tableId };

    // Add to connection pool
    if (!tableConnections.has(tableId)) {
      tableConnections.set(tableId, new Set());
    }
    tableConnections.get(tableId)?.add(connInfo);

    // Subscribe to memoryStore events (broadcasts to all clients)
    ensureTableSubscription(tableId);

    fastify.log.info(
      { tableId, userId, connections: getConnectionCount(tableId) },
      "WebSocket connected",
    );

    // Send subscription confirmation
    send(socket, serverMessage.subscribed(tableId));

    // Handle incoming messages
    socket.on("message", async (raw) => {
      try {
        const msg: unknown = JSON.parse(raw.toString());

        if (!isValidClientMessage(msg)) {
          send(
            socket,
            serverMessage.error("INVALID_MESSAGE", "Invalid message format"),
          );
          return;
        }

        await handleClientMessage(fastify, connInfo, msg);
      } catch (err) {
        fastify.log.error({ err }, "Error processing WebSocket message");
        send(
          socket,
          serverMessage.error("INTERNAL", "Failed to process message"),
        );
      }
    });

    // Handle connection close
    socket.on("close", () => {
      tableConnections.get(tableId)?.delete(connInfo);
      cleanupTableSubscription(tableId);
      fastify.log.info(
        { tableId, userId, connections: getConnectionCount(tableId) },
        "WebSocket disconnected",
      );
    });

    // Handle errors
    socket.on("error", (err) => {
      fastify.log.error({ err, tableId, userId }, "WebSocket error");
      tableConnections.get(tableId)?.delete(connInfo);
      cleanupTableSubscription(tableId);
    });
  });
}

/**
 * Handle a validated client message
 */
async function handleClientMessage(
  _fastify: FastifyInstance,
  conn: ConnectionInfo,
  msg: ClientMessage,
): Promise<void> {
  const { socket, tableId } = conn;

  switch (msg.type) {
    case "PING": {
      send(socket, serverMessage.pong());
      break;
    }

    case "CELL_UPDATE": {
      // Validate tableId matches connection
      if (msg.tableId !== tableId) {
        send(
          socket,
          serverMessage.error(
            "TABLE_MISMATCH",
            "Message tableId does not match connection",
            msg.clientSeq,
          ),
        );
        return;
      }

      // Validate row exists
      const existingRow = memoryStore.getRow(tableId, msg.rowId);
      if (!existingRow) {
        send(
          socket,
          serverMessage.error("NOT_FOUND", "Row not found", msg.clientSeq),
        );
        return;
      }

      // Apply event to memory store + WAL
      // This triggers the subscription which broadcasts to all clients
      const event: TableEvent = {
        type: "CELL_UPDATED",
        tableId,
        rowId: msg.rowId,
        columnId: msg.columnId,
        value: msg.value,
      };

      await memoryStore.applyEvent(event);

      // Update table's updatedAt
      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Get the event ID from the last WAL entry
      const lastEvent = await prisma.tableEvent.findFirst({
        where: { tableId },
        orderBy: { id: "desc" },
      });

      // ACK to sender (broadcast happens via subscription)
      send(socket, serverMessage.ack(msg.clientSeq, lastEvent?.id ?? 0n));
      break;
    }

    case "ROW_INSERT": {
      if (msg.tableId !== tableId) {
        send(
          socket,
          serverMessage.error(
            "TABLE_MISMATCH",
            "Message tableId does not match connection",
            msg.clientSeq,
          ),
        );
        return;
      }

      const rowId = crypto.randomUUID();
      const event: TableEvent = {
        type: "ROW_INSERTED",
        tableId,
        rowId,
        data: msg.data ?? {},
      };

      // This triggers the subscription which broadcasts to all clients
      await memoryStore.applyEvent(event);

      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Get the newly inserted row and send confirmation to sender
      const row = memoryStore.getRow(tableId, rowId);
      if (row) {
        send(
          socket,
          serverMessage.rowInserted(
            msg.clientSeq,
            rowId,
            row as {
              id: string;
              data: Record<string, unknown>;
              createdAt: string;
              updatedAt: string;
            },
          ),
        );
      }
      break;
    }

    case "ROW_DELETE": {
      if (msg.tableId !== tableId) {
        send(
          socket,
          serverMessage.error(
            "TABLE_MISMATCH",
            "Message tableId does not match connection",
            msg.clientSeq,
          ),
        );
        return;
      }

      const existingRow = memoryStore.getRow(tableId, msg.rowId);
      if (!existingRow) {
        send(
          socket,
          serverMessage.error("NOT_FOUND", "Row not found", msg.clientSeq),
        );
        return;
      }

      const event: TableEvent = {
        type: "ROW_DELETED",
        tableId,
        rowId: msg.rowId,
      };

      // This triggers the subscription which broadcasts to all clients
      await memoryStore.applyEvent(event);

      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      const lastEvent = await prisma.tableEvent.findFirst({
        where: { tableId },
        orderBy: { id: "desc" },
      });

      // ACK to sender (broadcast happens via subscription)
      send(socket, serverMessage.ack(msg.clientSeq, lastEvent?.id ?? 0n));
      break;
    }
  }
}
