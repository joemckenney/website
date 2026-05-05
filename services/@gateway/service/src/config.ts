export const config = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/auth/google/callback",
  },
  allowedEmails: (process.env.ALLOWED_EMAILS || process.env.ALLOWED_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  jwt: {
    accessSecret:
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      "dev-access-secret",
    refreshSecret:
      process.env.JWT_REFRESH_SECRET ||
      process.env.JWT_SECRET ||
      "dev-refresh-secret",
    accessTokenExpiry: "15m" as const, // 15 minutes
    refreshTokenExpiry: "7d" as const, // 7 days
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3002",
  agentServiceUrl: process.env.AGENT_SERVICE_URL || "http://localhost:3003",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:3006",
  relay: {
    baseUrl: process.env.RELAY_BASE_URL || "http://localhost:4000/v1",
    model: `relay/${process.env.AGENT_MODEL || "small"}`,
  },
  tablesServiceUrl: process.env.TABLES_SERVICE_URL || "http://localhost:3005",
  // Sharding config for tables service StatefulSet
  tablesServiceHeadless:
    process.env.TABLES_SERVICE_HEADLESS || "tables-service-headless",
  tablesServicePort: Number(process.env.TABLES_SERVICE_PORT) || 3005,
  tablesShardCount: Number(process.env.TABLES_SHARD_COUNT) || 1,
  yjsServiceUrl: process.env.YJS_SERVICE_URL || "ws://localhost:3006",
};
