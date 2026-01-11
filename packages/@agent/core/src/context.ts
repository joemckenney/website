import type { ClaudeMessage, ConversationMessage } from "./types.js";

/**
 * Configuration for context management
 */
export interface ContextConfig {
  /** Maximum tokens to use for context (default: 50000) */
  maxContextTokens: number;
  /** Tokens to reserve for the response (default: 4096) */
  reserveTokens: number;
}

const DEFAULT_CONFIG: ContextConfig = {
  maxContextTokens: 50000,
  reserveTokens: 4096,
};

/**
 * Rough token estimation (4 chars per token on average)
 * This is a simple heuristic - for production, use Claude's token counting API
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Convert conversation messages to Claude API format
 */
export function toClaudeMessages(
  messages: ConversationMessage[],
): ClaudeMessage[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return {
        role: "user" as const,
        content: msg.content,
      };
    }

    // Assistant message - may include tool use
    const content: Array<
      | { type: "text"; text: string }
      | {
          type: "tool_use";
          id: string;
          name: string;
          input: Record<string, unknown>;
        }
    > = [];

    if (msg.content) {
      content.push({ type: "text", text: msg.content });
    }

    if (msg.toolCalls) {
      for (const toolCall of msg.toolCalls) {
        content.push({
          type: "tool_use",
          id: toolCall.id,
          name: toolCall.name,
          input: toolCall.arguments,
        });
      }
    }

    return {
      role: "assistant" as const,
      content,
    };
  });
}

/**
 * Add tool results to the message history
 */
export function appendToolResults(
  messages: ClaudeMessage[],
  results: Array<{ toolCallId: string; result: unknown; isError?: boolean }>,
): ClaudeMessage[] {
  const toolResultContent = results.map((r) => ({
    type: "tool_result" as const,
    tool_use_id: r.toolCallId,
    content: typeof r.result === "string" ? r.result : JSON.stringify(r.result),
    is_error: r.isError,
  }));

  return [
    ...messages,
    {
      role: "user" as const,
      content: toolResultContent,
    },
  ];
}

/**
 * Truncate messages to fit within context window
 * Keeps the most recent messages while staying under the token limit
 */
export function truncateContext(
  messages: ConversationMessage[],
  config: ContextConfig = DEFAULT_CONFIG,
): ConversationMessage[] {
  const targetTokens = config.maxContextTokens - config.reserveTokens;

  // Always keep at least the last message
  if (messages.length <= 1) {
    return messages;
  }

  // Calculate tokens for each message
  const messageTokens = messages.map((msg) => {
    let tokens = estimateTokens(msg.content);
    if (msg.toolCalls) {
      tokens += estimateTokens(JSON.stringify(msg.toolCalls));
    }
    if (msg.toolResults) {
      tokens += estimateTokens(JSON.stringify(msg.toolResults));
    }
    return tokens;
  });

  // Start from the end and work backwards
  let totalTokens = 0;
  let startIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = messageTokens[i];
    if (totalTokens + msgTokens > targetTokens) {
      break;
    }
    totalTokens += msgTokens;
    startIndex = i;
  }

  return messages.slice(startIndex);
}
