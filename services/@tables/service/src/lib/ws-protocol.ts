import { Type, type Static } from "typebox";

/**
 * WebSocket Protocol for Tables Service
 *
 * Defines typed messages for client-server communication over WebSocket.
 * Used for real-time cell updates and multiplayer collaboration.
 */

// === Client → Server Messages ===

export const CellUpdateMessage = Type.Object({
  type: Type.Literal("CELL_UPDATE"),
  tableId: Type.String(),
  rowId: Type.String(),
  columnId: Type.String(),
  value: Type.Unknown(),
  clientSeq: Type.Number({
    description: "Client sequence number for ACK correlation",
  }),
});

export const RowInsertMessage = Type.Object({
  type: Type.Literal("ROW_INSERT"),
  tableId: Type.String(),
  data: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  clientSeq: Type.Number(),
});

export const RowDeleteMessage = Type.Object({
  type: Type.Literal("ROW_DELETE"),
  tableId: Type.String(),
  rowId: Type.String(),
  clientSeq: Type.Number(),
});

export const PingMessage = Type.Object({
  type: Type.Literal("PING"),
});

export const ClientMessageSchema = Type.Union([
  CellUpdateMessage,
  RowInsertMessage,
  RowDeleteMessage,
  PingMessage,
]);

export type ClientMessage = Static<typeof ClientMessageSchema>;

// === Server → Client Messages ===

export const SubscribedMessage = Type.Object({
  type: Type.Literal("SUBSCRIBED"),
  tableId: Type.String(),
});

export const EventMessage = Type.Object({
  type: Type.Literal("EVENT"),
  event: Type.Unknown(), // TableEvent - using Unknown to avoid circular deps
  originUserId: Type.Optional(
    Type.String({
      description: "User who triggered event (omitted for own events)",
    }),
  ),
});

export const AckMessage = Type.Object({
  type: Type.Literal("ACK"),
  clientSeq: Type.Number(),
  eventId: Type.String({ description: "BigInt serialized as string" }),
});

export const RowInsertedMessage = Type.Object({
  type: Type.Literal("ROW_INSERTED"),
  clientSeq: Type.Number(),
  rowId: Type.String(),
  row: Type.Object({
    id: Type.String(),
    data: Type.Record(Type.String(), Type.Unknown()),
    createdAt: Type.String(),
    updatedAt: Type.String(),
  }),
});

export const ErrorMessage = Type.Object({
  type: Type.Literal("ERROR"),
  code: Type.String(),
  message: Type.String(),
  clientSeq: Type.Optional(Type.Number()),
});

export const PongMessage = Type.Object({
  type: Type.Literal("PONG"),
});

export const ServerMessageSchema = Type.Union([
  SubscribedMessage,
  EventMessage,
  AckMessage,
  RowInsertedMessage,
  ErrorMessage,
  PongMessage,
]);

export type ServerMessage = Static<typeof ServerMessageSchema>;

// Type-specific message types for convenience
export type CellUpdateClientMessage = Static<typeof CellUpdateMessage>;
export type RowInsertClientMessage = Static<typeof RowInsertMessage>;
export type RowDeleteClientMessage = Static<typeof RowDeleteMessage>;

/**
 * Validate a client message at runtime
 */
export function isValidClientMessage(msg: unknown): msg is ClientMessage {
  if (!msg || typeof msg !== "object") return false;
  const m = msg as Record<string, unknown>;

  switch (m.type) {
    case "CELL_UPDATE":
      return (
        typeof m.tableId === "string" &&
        typeof m.rowId === "string" &&
        typeof m.columnId === "string" &&
        typeof m.clientSeq === "number"
      );
    case "ROW_INSERT":
      return typeof m.tableId === "string" && typeof m.clientSeq === "number";
    case "ROW_DELETE":
      return (
        typeof m.tableId === "string" &&
        typeof m.rowId === "string" &&
        typeof m.clientSeq === "number"
      );
    case "PING":
      return true;
    default:
      return false;
  }
}

/**
 * Create a typed server message helper
 */
export const serverMessage = {
  subscribed(tableId: string): ServerMessage {
    return { type: "SUBSCRIBED", tableId };
  },

  event(event: unknown, originUserId?: string): ServerMessage {
    return originUserId
      ? { type: "EVENT", event, originUserId }
      : { type: "EVENT", event };
  },

  ack(clientSeq: number, eventId: bigint): ServerMessage {
    return { type: "ACK", clientSeq, eventId: eventId.toString() };
  },

  rowInserted(
    clientSeq: number,
    rowId: string,
    row: {
      id: string;
      data: Record<string, unknown>;
      createdAt: string;
      updatedAt: string;
    },
  ): ServerMessage {
    return { type: "ROW_INSERTED", clientSeq, rowId, row };
  },

  error(code: string, message: string, clientSeq?: number): ServerMessage {
    return clientSeq !== undefined
      ? { type: "ERROR", code, message, clientSeq }
      : { type: "ERROR", code, message };
  },

  pong(): ServerMessage {
    return { type: "PONG" };
  },
};
