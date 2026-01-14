import type { ToolExecutionResult } from "@tools/core";

/**
 * Configuration for the agent
 */
export interface AgentConfig {
  /** Claude model to use (e.g., "claude-sonnet-4-20250514") */
  model: string;
  /** Maximum tokens in the response */
  maxTokens: number;
  /** Optional system prompt */
  systemPrompt?: string;
}

/**
 * Message in the conversation
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallData[];
  toolResults?: ToolExecutionResult[];
}

/**
 * Tool call data stored in messages
 */
export interface ToolCallData {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Events emitted during streaming
 */
export type StreamEvent =
  | { type: "text_delta"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, unknown>;
    }
  | {
      type: "tool_result";
      toolCallId: string;
      result: unknown;
      isError?: boolean;
    }
  | { type: "message_complete"; message: ConversationMessage }
  | { type: "error"; error: string };

/**
 * Context for the agent during execution
 */
export interface AgentContext {
  userId: string;
  conversationId: string;
  sessionId?: string; // Agent SDK session ID for multi-turn conversations
  abortSignal?: AbortSignal;
}

/**
 * MCP server configuration for HTTP/SSE transport
 */
export interface McpServerConfig {
  type: "sse" | "http";
  url: string;
  headers?: Record<string, string>;
}

/**
 * MCP server configuration for stdio transport (spawning a process)
 */
export interface McpServerStdioConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
