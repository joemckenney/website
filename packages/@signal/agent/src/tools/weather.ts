import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name or location"),
  }),
  outputSchema: z.object({
    location: z.string(),
    temperature: z.number(),
    condition: z.string(),
  }),
  execute: async ({ location }) => {
    // Stub — returns mock data. Replace with real API later.
    return {
      location,
      temperature: 72,
      condition: "sunny",
    };
  },
});
