import { useRef, useCallback } from "react";

interface DebouncedValue {
  value: unknown;
  onRollback: () => void;
}

interface UseDebouncedCellUpdateOptions {
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Function to send the cell update */
  sendCellUpdate: (
    rowId: string,
    columnId: string,
    value: unknown,
    onRollback?: () => void,
  ) => number;
}

interface UseDebouncedCellUpdateReturn {
  /**
   * Queue a cell update with debouncing.
   * Rapid updates to the same cell are coalesced into a single send.
   */
  updateCell: (
    rowId: string,
    columnId: string,
    value: unknown,
    onRollback: () => void,
  ) => void;
  /**
   * Immediately send all pending updates.
   * Call this on blur or before navigating away.
   */
  flush: () => void;
  /**
   * Cancel all pending updates without sending.
   */
  cancel: () => void;
}

/**
 * Hook for debouncing cell updates.
 *
 * Coalesces rapid edits to the same cell into a single WebSocket message.
 * This reduces network traffic when the user is typing quickly.
 *
 * Usage:
 * ```tsx
 * const { updateCell, flush } = useDebouncedCellUpdate({
 *   sendCellUpdate: socket.sendCellUpdate,
 * });
 *
 * // On every keystroke (debounced)
 * <input onChange={(e) => updateCell(rowId, colId, e.target.value, rollback)} />
 *
 * // On blur (flush immediately)
 * <input onBlur={flush} />
 * ```
 */
export function useDebouncedCellUpdate(
  options: UseDebouncedCellUpdateOptions,
): UseDebouncedCellUpdateReturn {
  const { debounceMs = 300, sendCellUpdate } = options;

  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const pendingValues = useRef<Map<string, DebouncedValue>>(new Map());
  const sendCellUpdateRef = useRef(sendCellUpdate);
  sendCellUpdateRef.current = sendCellUpdate;

  const makeKey = (rowId: string, columnId: string) => `${rowId}:${columnId}`;

  const updateCell = useCallback(
    (
      rowId: string,
      columnId: string,
      value: unknown,
      onRollback: () => void,
    ) => {
      const key = makeKey(rowId, columnId);

      // Clear existing timer for this cell
      const existingTimer = debounceTimers.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Store the latest value and rollback function
      pendingValues.current.set(key, { value, onRollback });

      // Set new timer
      const timer = setTimeout(() => {
        const pending = pendingValues.current.get(key);
        if (pending) {
          pendingValues.current.delete(key);
          debounceTimers.current.delete(key);
          sendCellUpdateRef.current(
            rowId,
            columnId,
            pending.value,
            pending.onRollback,
          );
        }
      }, debounceMs);

      debounceTimers.current.set(key, timer);
    },
    [debounceMs],
  );

  const flush = useCallback(() => {
    // Clear all timers and send pending values immediately
    for (const [key, timer] of debounceTimers.current) {
      clearTimeout(timer);
      debounceTimers.current.delete(key);

      const pending = pendingValues.current.get(key);
      if (pending) {
        const [rowId, columnId] = key.split(":");
        pendingValues.current.delete(key);
        sendCellUpdateRef.current(
          rowId,
          columnId,
          pending.value,
          pending.onRollback,
        );
      }
    }
  }, []);

  const cancel = useCallback(() => {
    // Clear all timers without sending
    for (const timer of debounceTimers.current.values()) {
      clearTimeout(timer);
    }
    debounceTimers.current.clear();
    pendingValues.current.clear();
  }, []);

  return { updateCell, flush, cancel };
}
