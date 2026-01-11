import type { StreamEvent } from "./types.js";

/**
 * Format a stream event as a Server-Sent Event string
 */
export function formatSSE(event: StreamEvent): string {
  let eventType: string;
  let data: unknown;

  switch (event.type) {
    case "text_delta":
      eventType = "delta";
      data = { content: event.text };
      break;
    case "tool_use":
      eventType = "tool_call";
      data = {
        id: event.id,
        name: event.name,
        arguments: event.input,
      };
      break;
    case "tool_result":
      eventType = "tool_result";
      data = {
        toolCallId: event.toolCallId,
        result: event.result,
        isError: event.isError,
      };
      break;
    case "message_complete":
      eventType = "done";
      data = { message: event.message };
      break;
    case "error":
      eventType = "error";
      data = { error: event.error };
      break;
  }

  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * SSE headers for HTTP responses
 */
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no", // Disable nginx buffering
} as const;
