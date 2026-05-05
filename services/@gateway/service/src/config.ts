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
    accessTokenExpiry: "15m" as const,
    refreshTokenExpiry: "7d" as const,
  },
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3001",
  userServiceUrl: process.env.USER_SERVICE_URL || "http://localhost:3002",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:3006",
  weatherServiceUrl: process.env.WEATHER_SERVICE_URL || "http://localhost:3004",
};
