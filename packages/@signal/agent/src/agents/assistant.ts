import { Agent } from "@mastra/core/agent";
import type { Agent as AgentType } from "@mastra/core/agent";
import { weatherTool } from "../tools/weather.js";

export const assistant: AgentType = new Agent({
  id: "assistant",
  name: "Assistant",
  instructions:
    "You are a helpful assistant. Use available tools when they can help answer the user's question.",
  model: {
    id: `relay/${process.env.AGENT_MODEL ?? "small"}`,
    url: process.env.RELAY_BASE_URL ?? "http://localhost:4000/v1",
    ...(process.env.RELAY_API_KEY && { apiKey: process.env.RELAY_API_KEY }),
  },
  tools: { weatherTool },
});
