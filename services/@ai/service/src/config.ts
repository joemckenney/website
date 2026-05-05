export const config = {
  port: Number(process.env.PORT) || 3006,
  nodeEnv: process.env.NODE_ENV || "development",
  vercel: {
    apiKey: process.env.VERCEL_AI_GATEWAY_API_KEY || "",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
  },
  allowedModels: (process.env.ALLOWED_MODELS || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
    maxPerWindow: Number(process.env.RATE_LIMIT_MAX) || 30,
  },
};
