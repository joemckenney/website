import type { WebSocket } from "@fastify/websocket";
import {
  context,
  propagation,
  type Span,
  SpanStatusCode,
  trace,
} from "@website/tracing";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { Counter, Gauge, Histogram } from "prom-client";
import { prisma } from "../db/client.js";
import type { TableEvent } from "../lib/events.js";
import {
  type ClientMessage,
  isValidClientMessage,
  type ServerMessage,
  serverMessage,
} from "../lib/ws-protocol.js";
import { memoryStore } from "../store/memory.js";

const tracer = trace.getTracer("tables-websocket");

const wsConnectionsActive = new Gauge({
  name: "ws_connections_active",
  help: "Number of active WebSocket connections",
  labelNames: ["table_id"],
});

const wsMessagesReceived = new Counter({
  name: "ws_messages_received_total",
  help: "Total WebSocket messages received from clients",
  labelNames: ["message_type"],
});

const wsMessagesSent = new Counter({
  name: "ws_messages_sent_total",
  help: "Total WebSocket messages sent to clients",
  labelNames: ["message_type"],
});

const wsMessageDuration = new Histogram({
  name: "ws_message_handling_duration_seconds",
  help: "Duration of WebSocket message handling",
  labelNames: ["message_type"],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
});

const wsBroadcastRecipients = new Histogram({
  name: "ws_broadcast_recipients",
  help: "Number of recipients per broadcast",
  buckets: [0, 1, 2, 5, 10, 25, 50, 100],
});

let log: FastifyBaseLogger;

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
    const carrier: Record<string, string> = {};
    propagation.inject(context.active(), carrier);
    const payload = carrier.traceparent
      ? { ...msg, _traceparent: carrier.traceparent }
      : msg;
    socket.send(JSON.stringify(payload));
    wsMessagesSent.inc({ message_type: msg.type });
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

  // Inject trace context so the gateway can continue the trace
  const carrier: Record<string, string> = {};
  propagation.inject(context.active(), carrier);
  if (carrier.traceparent) {
    (msg as Record<string, unknown>)._traceparent = carrier.traceparent;
  }

  const data = JSON.stringify(msg);

  let recipientCount = 0;
  for (const conn of connections) {
    if (conn.socket.readyState === 1) {
      conn.socket.send(data);
      recipientCount++;
    }
  }

  wsBroadcastRecipients.observe(recipientCount);
  wsMessagesSent.inc({ message_type: "EVENT" }, recipientCount);
  log?.info({ tableId, recipientCount }, "Broadcast event");
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
  log = fastify.log;

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
    wsConnectionsActive.inc({ table_id: tableId });

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

        const messageType = msg.type;
        const clientSeq = "clientSeq" in msg ? msg.clientSeq : undefined;
        wsMessagesReceived.inc({ message_type: messageType });
        const endTimer = wsMessageDuration.startTimer({
          message_type: messageType,
        });

        // Extract trace context injected by the gateway
        const parsed = msg as Record<string, unknown>;
        const parentCtx = parsed._traceparent
          ? propagation.extract(context.active(), {
              traceparent: parsed._traceparent as string,
            })
          : context.active();

        await tracer.startActiveSpan(
          `ws.${messageType}`,
          {},
          parentCtx,
          async (span: Span) => {
            span.setAttributes({
              "ws.message_type": messageType,
              "ws.table_id": tableId,
              "ws.user_id": userId,
            });
            if (clientSeq !== undefined) {
              span.setAttribute("ws.client_seq", clientSeq as number);
            }

            try {
              fastify.log.info(
                { message: msg, tableId, userId },
                "Handling WS message",
              );
              await handleClientMessage(fastify, connInfo, msg);
            } catch (err) {
              span.recordException(err as Error);
              span.setStatus({ code: SpanStatusCode.ERROR });
              throw err;
            } finally {
              endTimer();
              span.end();
            }
          },
        );
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
      wsConnectionsActive.dec({ table_id: tableId });
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
      wsConnectionsActive.dec({ table_id: tableId });
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
