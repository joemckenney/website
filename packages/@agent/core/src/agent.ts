import Anthropic from "@anthropic-ai/sdk";
import type { ToolCall, ToolContext, ToolRegistry } from "@tools/core";
import {
  appendToolResults,
  toClaudeMessages,
  truncateContext,
} from "./context.js";
import type {
  AgentConfig,
  AgentContext,
  ConversationMessage,
  StreamEvent,
  ToolCallData,
} from "./types.js";

const DEFAULT_CONFIG: AgentConfig = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 4096,
};

/**
 * Agent that wraps the Claude SDK with tool execution and streaming support
 */
export class Agent {
  private client: Anthropic;
  private config: AgentConfig;
  private toolRegistry: ToolRegistry;

  constructor(toolRegistry: ToolRegistry, config: Partial<AgentConfig> = {}) {
    this.client = new Anthropic();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.toolRegistry = toolRegistry;
  }

  /**
   * Stream a response from the agent, handling tool execution automatically
   */
  async *stream(
    messages: ConversationMessage[],
    context: AgentContext,
  ): AsyncGenerator<StreamEvent> {
    // Truncate context if needed
    const truncatedMessages = truncateContext(messages);
    let claudeMessages = toClaudeMessages(truncatedMessages);

    const tools = this.toolRegistry.toClaudeTools();
    const toolContext: ToolContext = {
      userId: context.userId,
      conversationId: context.conversationId,
      abortSignal: context.abortSignal,
    };

    // Loop to handle tool use
    while (true) {
      let fullText = "";
      const toolCalls: ToolCallData[] = [];
      let stopReason: string | null = null;

      try {
        const stream = this.client.messages.stream({
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          system: this.config.systemPrompt,
          messages: claudeMessages,
          tools: tools.length > 0 ? tools : undefined,
        });

        // Handle abort signal
        if (context.abortSignal) {
          context.abortSignal.addEventListener("abort", () => {
            stream.controller.abort();
          });
        }

        for await (const event of stream) {
          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              fullText += event.delta.text;
              yield { type: "text_delta", text: event.delta.text };
            } else if (event.delta.type === "input_json_delta") {
              // Tool input is being streamed - we'll get the full input at the end
            }
          } else if (event.type === "content_block_start") {
            if (event.content_block.type === "tool_use") {
              // Tool use starting
            }
          } else if (event.type === "content_block_stop") {
            // Content block finished
          } else if (event.type === "message_stop") {
            // Message finished
          } else if (event.type === "message_delta") {
            stopReason = event.delta.stop_reason;
          }
        }

        // Get the final message to extract tool calls
        const finalMessage = await stream.finalMessage();

        for (const block of finalMessage.content) {
          if (block.type === "tool_use") {
            const toolCall: ToolCallData = {
              id: block.id,
              name: block.name,
              arguments: block.input as Record<string, unknown>,
            };
            toolCalls.push(toolCall);

            yield {
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: block.input as Record<string, unknown>,
            };
          }
        }

        stopReason = finalMessage.stop_reason;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          yield { type: "error", error: "Request was cancelled" };
          return;
        }
        yield {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
        return;
      }

      // If there are tool calls, execute them and continue
      if (stopReason === "tool_use" && toolCalls.length > 0) {
        // Execute tools
        const toolResults = await this.toolRegistry.executeAll(
          toolCalls.map(
            (tc): ToolCall => ({
              id: tc.id,
              name: tc.name,
              input: tc.arguments,
            }),
          ),
          toolContext,
        );

        // Yield tool results
        for (const result of toolResults) {
          yield {
            type: "tool_result",
            toolCallId: result.toolCallId,
            result: result.result,
            isError: result.isError,
          };
        }

        // Add assistant message with tool calls to history
        claudeMessages = [
          ...claudeMessages,
          {
            role: "assistant" as const,
            content: [
              ...(fullText ? [{ type: "text" as const, text: fullText }] : []),
              ...toolCalls.map((tc) => ({
                type: "tool_use" as const,
                id: tc.id,
                name: tc.name,
                input: tc.arguments,
              })),
            ],
          },
        ];

        // Add tool results
        claudeMessages = appendToolResults(claudeMessages, toolResults);

        // Continue the loop to get the next response
        continue;
      }

      // No more tool calls - we're done
      const completeMessage: ConversationMessage = {
        role: "assistant",
        content: fullText,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      yield { type: "message_complete", message: completeMessage };
      return;
    }
  }
}

/**
 * Create a new agent instance
 */
export function createAgent(
  toolRegistry: ToolRegistry,
  config?: Partial<AgentConfig>,
): Agent {
  return new Agent(toolRegistry, config);
}
