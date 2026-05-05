import { createAnthropic } from "@ai-sdk/anthropic";
import { createGateway } from "@ai-sdk/gateway";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import { config } from "../config.js";

const anthropic = createAnthropic({ apiKey: config.anthropic.apiKey });

const vercel = createGateway({
  apiKey: config.vercel.apiKey,
  // baseURL omitted — @ai-sdk/gateway uses Vercel AI Gateway's correct URL by default.
  // Override via VERCEL_AI_GATEWAY_BASE_URL only if pointing at a non-Vercel relay.
  ...(process.env.VERCEL_AI_GATEWAY_BASE_URL
    ? { baseURL: process.env.VERCEL_AI_GATEWAY_BASE_URL }
    : {}),
});

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: config.ollama.baseUrl,
});

export function resolveModel(modelId: string): LanguageModel {
  const slash = modelId.indexOf("/");
  if (slash === -1) {
    throw new Error(`Model id must be "provider/name", got: ${modelId}`);
  }
  const provider = modelId.slice(0, slash);
  const name = modelId.slice(slash + 1);

  switch (provider) {
    case "anthropic":
      return anthropic(name);
    case "vercel":
      return vercel(name);
    case "ollama":
      return ollama(name);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export function isAllowed(modelId: string): boolean {
  return (
    config.allowedModels.length > 0 && config.allowedModels.includes(modelId)
  );
}
