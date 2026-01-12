import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
  AgentConfig,
  AgentContext,
  ConversationMessage,
  McpServerConfig,
  StreamEvent,
} from "./types.js";

const DEFAULT_CONFIG: AgentConfig = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
};

/**
 * Options for the Agent SDK query
 */
interface AgentQueryOptions {
  allowedTools?: string[];
  mcpServers?: Record<string, McpServerConfig>;
  permissionMode?: "bypassPermissions" | "acceptEdits" | "default";
}

/**
 * Result from the agent stream including the session ID for resumption
 */
export interface AgentStreamResult {
  sessionId?: string;
}

/**
 * Agent that wraps the Claude Agent SDK with streaming support
 */
export class Agent {
  private config: AgentConfig;
  private queryOptions: AgentQueryOptions;

  constructor(config: Partial<AgentConfig> = {}, options: AgentQueryOptions = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.queryOptions = {
      allowedTools: options.allowedTools ?? ["WebSearch"],
      mcpServers: options.mcpServers,
      permissionMode: options.permissionMode ?? "bypassPermissions",
    };
  }

  /**
   * Stream a response from the agent using Claude Agent SDK
   *
   * For new conversations, pass the user's message as the prompt.
   * For continuing conversations, pass the sessionId to resume.
   */
  async *stream(
    prompt: string,
    context: AgentContext,
  ): AsyncGenerator<StreamEvent, AgentStreamResult> {
    let sessionId: string | undefined;
    let fullText = "";

    try {
      const queryOptions: Parameters<typeof query>[0] = {
        prompt,
        options: {
          allowedTools: this.queryOptions.allowedTools,
          permissionMode: this.queryOptions.permissionMode,
          ...(this.queryOptions.mcpServers && {
            mcpServers: this.queryOptions.mcpServers,
          }),
          ...(context.sessionId && {
            resume: context.sessionId,
          }),
        },
      };

      console.log(`[Agent] Starting query with options:`, JSON.stringify({
        prompt: prompt.slice(0, 100),
        allowedTools: this.queryOptions.allowedTools,
        permissionMode: this.queryOptions.permissionMode,
        mcpServers: this.queryOptions.mcpServers ? Object.keys(this.queryOptions.mcpServers) : [],
        mcpServersConfig: this.queryOptions.mcpServers,
        hasSessionId: !!context.sessionId,
      }, null, 2));

      for await (const message of query(queryOptions)) {
        // Log all messages from Agent SDK for debugging
        console.log(`[Agent SDK] Message type: ${message.type}`,
          'subtype' in message ? `subtype: ${message.subtype}` : '',
          JSON.stringify(message, null, 2).slice(0, 300));

        // Extract session_id from any message that has it
        if ('session_id' in message) {
          sessionId = message.session_id;
        }

        // Handle different message types from Agent SDK
        if (message.type === "system" && message.subtype === "init") {
          // Init message - session ID already captured above
        } else if (message.type === "stream_event") {
          // Streaming event from Anthropic API
          const event = message.event;
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              fullText += event.delta.text;
              yield { type: "text_delta", text: event.delta.text };
            }
          }
        } else if (message.type === "assistant") {
          // Complete assistant message with content blocks
          if (message.message?.content) {
            for (const block of message.message.content) {
              if (block.type === "text") {
                // Yield text content as delta events
                fullText += block.text;
                yield { type: "text_delta", text: block.text };
              } else if (block.type === "tool_use") {
                yield {
                  type: "tool_use",
                  id: block.id,
                  name: block.name,
                  input: block.input as Record<string, unknown>,
                };
              }
            }
          }
        } else if (message.type === "tool_progress") {
          // Tool is being executed - emit as tool result progress
          // This indicates the tool is still running
        } else if (message.type === "result") {
          // Final result
          if (message.subtype === "success") {
            // If we haven't captured any text yet, use the result
            if (message.result && !fullText) {
              fullText = message.result;
              yield { type: "text_delta", text: message.result };
            }
          } else {
            // Error result
            const errorMessage = message.errors?.join(", ") || "Agent execution failed";
            yield {
              type: "error",
              error: errorMessage,
            };
            return { sessionId };
          }
        }
      }

      // Emit message complete event
      const completeMessage: ConversationMessage = {
        role: "assistant",
        content: fullText,
      };

      yield { type: "message_complete", message: completeMessage };
      return { sessionId };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        yield { type: "error", error: "Request was cancelled" };
        return { sessionId };
      }
      yield {
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      };
      return { sessionId };
    }
  }
}

/**
 * Create a new agent instance
 */
export function createAgent(
  config?: Partial<AgentConfig>,
  options?: AgentQueryOptions,
): Agent {
  return new Agent(config, options);
}
