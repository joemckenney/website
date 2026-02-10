import { useCallback, useEffect, useRef, useState } from "react";
import { ensureValidToken } from "../lib/auth";

/**
 * WebSocket Protocol Types (mirrored from @tables/service)
 */

// Client -> Server messages
type ClientMessage =
  | {
      type: "CELL_UPDATE";
      tableId: string;
      rowId: string;
      columnId: string;
      value: unknown;
      clientSeq: number;
    }
  | {
      type: "ROW_INSERT";
      tableId: string;
      data?: Record<string, unknown>;
      clientSeq: number;
    }
  | {
      type: "ROW_DELETE";
      tableId: string;
      rowId: string;
      clientSeq: number;
    }
  | { type: "PING" };

// Server -> Client messages
type ServerMessage =
  | { type: "SUBSCRIBED"; tableId: string }
  | { type: "EVENT"; event: TableEvent; originUserId?: string }
  | { type: "ACK"; clientSeq: number; eventId: string }
  | {
      type: "ROW_INSERTED";
      clientSeq: number;
      rowId: string;
      row: {
        id: string;
        data: Record<string, unknown>;
        createdAt: string;
        updatedAt: string;
      };
    }
  | { type: "ERROR"; code: string; message: string; clientSeq?: number }
  | { type: "PONG" };

// Table events (from other users)
export type TableEvent =
  | {
      type: "CELL_UPDATED";
      tableId: string;
      rowId: string;
      columnId: string;
      value: unknown;
    }
  | {
      type: "ROW_INSERTED";
      tableId: string;
      rowId: string;
      data: Record<string, unknown>;
    }
  | { type: "ROW_DELETED"; tableId: string; rowId: string }
  | {
      type: "COLUMN_ADDED";
      tableId: string;
      columnId: string;
      name: string;
      dataType: string;
      position: number;
      referencedTableId?: string;
    }
  | { type: "COLUMN_RENAMED"; tableId: string; columnId: string; name: string }
  | { type: "COLUMN_DELETED"; tableId: string; columnId: string };

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface UseTableSocketOptions {
  tableId: string;
  /** Called when an event from another user is received */
  onEvent: (event: TableEvent) => void;
  /** Called when a row insert succeeds */
  onRowInserted?: (
    clientSeq: number,
    row: ServerMessage & { type: "ROW_INSERTED" },
  ) => void;
  /** Called when an operation is acknowledged */
  onAck?: (clientSeq: number, eventId: string) => void;
  /** Called when an error occurs */
  onError?: (error: {
    code: string;
    message: string;
    clientSeq?: number;
  }) => void;
  /** Whether to automatically reconnect on disconnect */
  autoReconnect?: boolean;
}

interface PendingOperation {
  clientSeq: number;
  onRollback?: () => void;
}

export interface UseTableSocketReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Send a cell update */
  sendCellUpdate: (
    rowId: string,
    columnId: string,
    value: unknown,
    onRollback?: () => void,
  ) => number;
  /** Send a row insert */
  sendRowInsert: (data?: Record<string, unknown>) => number;
  /** Send a row delete */
  sendRowDelete: (rowId: string, onRollback?: () => void) => number;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

export function useTableSocket(
  options: UseTableSocketOptions,
): UseTableSocketReturn {
  const {
    tableId,
    onEvent,
    onRowInserted,
    onAck,
    onError,
    autoReconnect = true,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef(0);
  const pendingRef = useRef<Map<number, PendingOperation>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  // Store latest callbacks in refs to avoid reconnecting on callback changes
  const onEventRef = useRef(onEvent);
  const onRowInsertedRef = useRef(onRowInserted);
  const onAckRef = useRef(onAck);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onEventRef.current = onEvent;
    onRowInsertedRef.current = onRowInserted;
    onAckRef.current = onAck;
    onErrorRef.current = onError;
  }, [onEvent, onRowInserted, onAck, onError]);

  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case "SUBSCRIBED":
        // Connection confirmed
        break;

      case "EVENT":
        // Only process events from other users
        if (msg.originUserId) {
          onEventRef.current(msg.event as TableEvent);
        }
        break;

      case "ACK":
        onAckRef.current?.(msg.clientSeq, msg.eventId);
        pendingRef.current.delete(msg.clientSeq);
        break;

      case "ROW_INSERTED":
        onRowInsertedRef.current?.(msg.clientSeq, msg);
        pendingRef.current.delete(msg.clientSeq);
        break;

      case "ERROR":
        onErrorRef.current?.(msg);
        // Trigger rollback for failed operation
        if (msg.clientSeq !== undefined) {
          const pending = pendingRef.current.get(msg.clientSeq);
          pending?.onRollback?.();
          pendingRef.current.delete(msg.clientSeq);
        }
        break;

      case "PONG":
        // Heartbeat response
        break;
    }
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus("connecting");

    const token = await ensureValidToken();
    if (!token) {
      setStatus("error");
      onErrorRef.current?.({
        code: "AUTH_FAILED",
        message: "Not authenticated",
      });
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    const wsUrl = apiUrl.replace(/^http/, "ws");
    const url = `${wsUrl}/tables/ws/${tableId}?token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        setStatus("connected");
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleMessage(msg);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setStatus("disconnected");
        wsRef.current = null;

        // Attempt reconnection with exponential backoff
        if (autoReconnect && isMountedRef.current) {
          const delay = Math.min(
            1000 * 2 ** reconnectAttemptsRef.current,
            30000,
          );
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setStatus("error");
      };
    } catch (err) {
      setStatus("error");
      console.error("WebSocket connection failed:", err);
    }
  }, [tableId, autoReconnect, handleMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  const send = useCallback((msg: ClientMessage): boolean => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return false;
    }
    wsRef.current.send(JSON.stringify(msg));
    return true;
  }, []);

  const sendCellUpdate = useCallback(
    (
      rowId: string,
      columnId: string,
      value: unknown,
      onRollback?: () => void,
    ): number => {
      const seq = ++seqRef.current;
      pendingRef.current.set(seq, { clientSeq: seq, onRollback });

      const msg: ClientMessage = {
        type: "CELL_UPDATE",
        tableId,
        rowId,
        columnId,
        value,
        clientSeq: seq,
      };

      if (!send(msg) && onRollback) {
        // Failed to send, trigger immediate rollback
        onRollback();
        pendingRef.current.delete(seq);
      }

      return seq;
    },
    [tableId, send],
  );

  const sendRowInsert = useCallback(
    (data?: Record<string, unknown>): number => {
      const seq = ++seqRef.current;
      pendingRef.current.set(seq, { clientSeq: seq });

      const msg: ClientMessage = {
        type: "ROW_INSERT",
        tableId,
        data,
        clientSeq: seq,
      };

      send(msg);
      return seq;
    },
    [tableId, send],
  );

  const sendRowDelete = useCallback(
    (rowId: string, onRollback?: () => void): number => {
      const seq = ++seqRef.current;
      pendingRef.current.set(seq, { clientSeq: seq, onRollback });

      const msg: ClientMessage = {
        type: "ROW_DELETE",
        tableId,
        rowId,
        clientSeq: seq,
      };

      if (!send(msg) && onRollback) {
        onRollback();
        pendingRef.current.delete(seq);
      }

      return seq;
    },
    [tableId, send],
  );

  // Connect on mount
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping to keep connection alive
  useEffect(() => {
    if (status !== "connected") return;

    const interval = setInterval(() => {
      send({ type: "PING" });
    }, 30000);

    return () => clearInterval(interval);
  }, [status, send]);

  return {
    status,
    sendCellUpdate,
    sendRowInsert,
    sendRowDelete,
    disconnect,
    reconnect,
  };
}
