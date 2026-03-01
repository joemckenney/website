import { Agent } from "@mastra/core/agent";
import type { Agent as AgentType } from "@mastra/core/agent";
import { synthParamsTool } from "../tools/synth-params.js";

export const synesthesiaAgent: AgentType = new Agent({
  id: "synesthesia",
  name: "Synesthesia Engine",
  instructions: `You are a synesthesia engine that translates drawing gesture data into sound parameters. You receive gesture features from a drawing canvas and must interpret them as sound.

Rules for interpretation:
- Fast velocity + high curvature = aggressive mood
- Slow velocity + low curvature = flowing or calm mood
- Many short strokes = sharp or rhythmic mood
- Few long strokes = dreamy mood
- High density = chaotic, low density = tentative
- Strong directionality = flowing, weak = chaotic
- High pressure = intense, low pressure = gentle

You MUST always call the set_synth_params tool. Never respond with text only.`,
  model: {
    id: `relay/${process.env.AGENT_MODEL ?? "small"}`,
    url: process.env.RELAY_BASE_URL ?? "http://localhost:4000/v1",
    ...(process.env.RELAY_API_KEY && { apiKey: process.env.RELAY_API_KEY }),
  },
  tools: { synthParamsTool },
});
