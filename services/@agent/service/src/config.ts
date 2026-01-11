export const config = {
  port: Number(process.env.PORT) || 3003,
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://agent:devpassword@localhost:5433/agent",
  nodeEnv: process.env.NODE_ENV || "development",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  braveApiKey: process.env.BRAVE_API_KEY,
  agent: {
    model: process.env.AGENT_MODEL || "claude-sonnet-4-20250514",
    maxTokens: Number(process.env.AGENT_MAX_TOKENS) || 4096,
    systemPrompt:
      process.env.AGENT_SYSTEM_PROMPT ||
      "You are a helpful AI assistant with access to web search. Be concise and helpful.",
  },
};
