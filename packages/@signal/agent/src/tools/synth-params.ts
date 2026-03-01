import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const SynthParamsInput = z.object({
  mood: z
    .enum([
      "aggressive",
      "tentative",
      "rhythmic",
      "flowing",
      "chaotic",
      "calm",
      "sharp",
      "dreamy",
    ])
    .describe("The emotional quality of the gesture"),
  intensity: z
    .number()
    .min(0)
    .max(1)
    .describe("Overall energy level from 0.0 (silent) to 1.0 (maximal)"),
  pitch_center: z
    .enum(["low", "mid_low", "mid", "mid_high", "high"])
    .describe("Pitch register for the sound"),
  texture: z
    .enum(["smooth", "rough", "pulsing", "shimmering", "gritty"])
    .describe("Timbral quality of the sound"),
  space: z
    .enum(["tight", "medium", "wide", "vast"])
    .describe("Spatial openness / reverb character"),
  movement: z
    .number()
    .min(0)
    .max(1)
    .describe("Rate of modulation / LFO activity from 0.0 (static) to 1.0 (rapid)"),
});

const SynthParamsOutput = SynthParamsInput;

export const synthParamsTool = createTool({
  id: "set-synth-params",
  description:
    "Set audio synthesis parameters based on the gesture analysis. Always call this tool with your interpretation.",
  inputSchema: SynthParamsInput,
  outputSchema: SynthParamsOutput,
  execute: async (input) => {
    // Pass-through — the tool is structured output extraction.
    // The LLM's chosen params are returned as-is.
    return input;
  },
});
