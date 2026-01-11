/**
 * SSE streaming client for the agent chat endpoint.
 * The OpenAPI generator doesn't handle SSE well, so we provide
 * this custom streaming function.
 */

/**
 * Event types emitted by the chat SSE endpoint
 */
export type ChatStreamEventType =
  | "delta"
  | "tool_call"
  | "tool_result"
  | "done"
  | "error";

/**
 * Data payload for each event type
 */
export interface ChatStreamEventData {
  delta: { content: string };
  tool_call: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  };
  tool_result: {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  };
  done: {
    message: {
      role: "assistant";
      content: string;
      toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
      }>;
    };
  };
  error: { error: string };
}

/**
 * A single SSE event from the chat stream
 */
export type ChatStreamEvent<T extends ChatStreamEventType = ChatStreamEventType> = {
  event: T;
  data: ChatStreamEventData[T];
};

/**
 * Options for the streaming chat request
 */
export interface StreamChatOptions {
  /** Base URL of the API */
  baseUrl: string;
  /** JWT access token for authentication */
  accessToken: string;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
}

/**
 * Stream chat responses from the agent.
 *
 * @example
 * ```ts
 * for await (const event of streamChat(conversationId, message, {
 *   baseUrl: "http://localhost:3000",
 *   accessToken: "your-jwt-token",
 * })) {
 *   if (event.event === "delta") {
 *     process.stdout.write(event.data.content);
 *   } else if (event.event === "error") {
 *     console.error("Error:", event.data.error);
 *   }
 * }
 * ```
 */
export async function* streamChat(
  conversationId: string,
  message: string,
  options: StreamChatOptions
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(
    `${options.baseUrl}/agent/conversations/${conversationId}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.accessToken}`,
      },
      body: JSON.stringify({ message }),
      signal: options.signal,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat request failed: ${response.status} ${error}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const chunk of lines) {
      if (!chunk.trim()) continue;

      const eventMatch = chunk.match(/^event: (.+)$/m);
      const dataMatch = chunk.match(/^data: (.+)$/m);

      if (eventMatch && dataMatch) {
        try {
          yield {
            event: eventMatch[1] as ChatStreamEventType,
            data: JSON.parse(dataMatch[1]),
          } as ChatStreamEvent;
        } catch {
          // Skip malformed events
        }
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    const eventMatch = buffer.match(/^event: (.+)$/m);
    const dataMatch = buffer.match(/^data: (.+)$/m);

    if (eventMatch && dataMatch) {
      try {
        yield {
          event: eventMatch[1] as ChatStreamEventType,
          data: JSON.parse(dataMatch[1]),
        } as ChatStreamEvent;
      } catch {
        // Skip malformed events
      }
    }
  }
}
