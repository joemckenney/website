/**
 * Context utilities for the Agent SDK
 *
 * Note: The Claude Agent SDK handles context management internally via sessions.
 * This file is retained for potential future utilities but the previous
 * message-based context management is no longer needed.
 */

/**
 * Configuration for context management (legacy - retained for reference)
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
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
