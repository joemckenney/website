import type { TObject } from "typebox";
import type {
  ClaudeTool,
  ToolCall,
  ToolContext,
  ToolDefinition,
  ToolExecutionResult,
  ToolResult,
} from "./types.js";

/**
 * Convert a TypeBox schema to JSON Schema format for Claude API
 */
function typeboxToJsonSchema(schema: TObject): ClaudeTool["input_schema"] {
  // TypeBox schemas are already JSON Schema compatible
  // We just need to extract the relevant parts
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(schema.properties)) {
    properties[key] = {
      type: (value as { type?: string }).type,
      description: (value as { description?: string }).description,
      ...(value as object),
    };

    // Check if the property is required (not optional)
    if (schema.required?.includes(key)) {
      required.push(key);
    }
  }

  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required } : {}),
  };
}

/**
 * Registry for managing tools available to the agent.
 * Handles registration, lookup, and format conversion for Claude API.
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /**
   * Register a tool with the registry
   */
  register<T extends TObject>(tool: ToolDefinition<T>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as ToolDefinition);
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool is registered
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Convert all registered tools to Claude API format
   */
  toClaudeTools(): ClaudeTool[] {
    return this.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: typeboxToJsonSchema(tool.inputSchema),
    }));
  }

  /**
   * Execute a tool call from Claude's response
   */
  async execute(
    toolCall: ToolCall,
    context: ToolContext,
  ): Promise<ToolExecutionResult> {
    const tool = this.get(toolCall.name);

    if (!tool) {
      return {
        toolCallId: toolCall.id,
        result: `Tool "${toolCall.name}" not found`,
        isError: true,
      };
    }

    try {
      const result: ToolResult = await tool.execute(toolCall.input, context);

      if (!result.success) {
        return {
          toolCallId: toolCall.id,
          result: result.error || "Tool execution failed",
          isError: true,
        };
      }

      return {
        toolCallId: toolCall.id,
        result: result.data,
      };
    } catch (error) {
      return {
        toolCallId: toolCall.id,
        result: error instanceof Error ? error.message : "Unknown error",
        isError: true,
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel
   */
  async executeAll(
    toolCalls: ToolCall[],
    context: ToolContext,
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(
      toolCalls.map((toolCall) => this.execute(toolCall, context)),
    );
  }
}

/**
 * Create a new tool registry, optionally with initial tools
 */
export function createToolRegistry(tools?: ToolDefinition[]): ToolRegistry {
  const registry = new ToolRegistry();
  if (tools) {
    for (const tool of tools) {
      registry.register(tool);
    }
  }
  return registry;
}
