import type { ToolContext, ToolDefinition, ToolResult } from "@tools/core";
import { Type } from "typebox";

/**
 * Brave Search API response types
 */
interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
}

interface BraveSearchResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
  query?: {
    original: string;
  };
}

const InputSchema = Type.Object({
  query: Type.String({ description: "Search query to look up on the web" }),
  maxResults: Type.Optional(
    Type.Number({
      description: "Maximum number of results to return (default: 5)",
      minimum: 1,
      maximum: 10,
      default: 5,
    }),
  ),
});

/**
 * Web search tool using Brave Search API
 *
 * Environment variables required:
 * - BRAVE_API_KEY: Your Brave Search API key
 */
export const webSearchTool: ToolDefinition<typeof InputSchema> = {
  name: "web_search",
  description:
    "Search the web for current information. Use this to find up-to-date information about any topic, news, facts, or data that may not be in your training data.",
  inputSchema: InputSchema,

  async execute(input, context: ToolContext): Promise<ToolResult> {
    const apiKey = process.env.BRAVE_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "BRAVE_API_KEY environment variable is not set",
      };
    }

    const maxResults = input.maxResults ?? 5;

    try {
      const url = new URL("https://api.search.brave.com/res/v1/web/search");
      url.searchParams.set("q", input.query);
      url.searchParams.set("count", String(maxResults));

      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": apiKey,
        },
        signal: context.abortSignal,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Brave Search API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as BraveSearchResponse;

      const results: BraveSearchResult[] =
        data.web?.results.slice(0, maxResults).map((result) => ({
          title: result.title,
          url: result.url,
          description: result.description,
        })) ?? [];

      return {
        success: true,
        data: {
          query: data.query?.original ?? input.query,
          results,
          count: results.length,
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Search was cancelled",
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown search error",
      };
    }
  },
};
