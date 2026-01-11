import type { Static, TObject } from "typebox";

/**
 * Context provided to tools during execution
 */
export interface ToolContext {
  userId: string;
  conversationId: string;
  abortSignal?: AbortSignal;
}

/**
 * Result returned from tool execution
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Definition of a tool that can be used by the agent.
 * Uses TypeBox for schema validation and type inference.
 */
export interface ToolDefinition<TInput extends TObject = TObject> {
  /** Unique identifier for the tool */
  name: string;

  /** Human-readable description of what the tool does */
  description: string;

  /** TypeBox schema defining the input parameters */
  inputSchema: TInput;

  /** Execute the tool with validated input */
  execute(input: Static<TInput>, context: ToolContext): Promise<ToolResult>;
}

/**
 * Claude API tool format for the Anthropic SDK
 */
export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Tool call from Claude's response
 */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Result of a tool execution to send back to Claude
 */
export interface ToolExecutionResult {
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}
