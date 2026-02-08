import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { prisma } from "../db/client.js";
import type { TableEvent } from "../lib/events.js";
import {
  isValidClientMessage,
  serverMessage,
  type ClientMessage,
  type ServerMessage,
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
 * Send a typed message to a WebSocket
 */
function send(socket: WebSocket, msg: ServerMessage): void {
  if (socket.readyState === 1) {
    socket.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast a message to all connections for a table, optionally excluding one
 */
function broadcast(
  tableId: string,
  msg: ServerMessage,
  excludeSocket?: WebSocket,
): void {
  const connections = tableConnections.get(tableId);
  if (!connections) return;

  const data = JSON.stringify(msg);
  for (const conn of connections) {
    if (conn.socket !== excludeSocket && conn.socket.readyState === 1) {
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
      fastify.log.info(
        { tableId, userId, connections: getConnectionCount(tableId) },
        "WebSocket disconnected",
      );
    });

    // Handle errors
    socket.on("error", (err) => {
      fastify.log.error({ err, tableId, userId }, "WebSocket error");
      tableConnections.get(tableId)?.delete(connInfo);
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
  const { socket, userId, tableId } = conn;

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

      // ACK to sender
      send(socket, serverMessage.ack(msg.clientSeq, lastEvent?.id ?? 0n));

      // Broadcast to other clients (excluding sender)
      broadcast(tableId, serverMessage.event(event, userId), socket);
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

      await memoryStore.applyEvent(event);

      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      // Get the newly inserted row
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

      // Broadcast to other clients
      broadcast(tableId, serverMessage.event(event, userId), socket);
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

      await memoryStore.applyEvent(event);

      await prisma.tableMeta.update({
        where: { id: tableId },
        data: { updatedAt: new Date() },
      });

      const lastEvent = await prisma.tableEvent.findFirst({
        where: { tableId },
        orderBy: { id: "desc" },
      });

      send(socket, serverMessage.ack(msg.clientSeq, lastEvent?.id ?? 0n));
      broadcast(tableId, serverMessage.event(event, userId), socket);
      break;
    }
  }
}
