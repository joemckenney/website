import "dotenv/config";

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const isDev = process.env.NODE_ENV !== "production";

export const config = {
  port: Number.parseInt(getEnvVar("PORT", "3004"), 10),

  // Strava OAuth - use placeholders in dev if not set
  strava: {
    clientId: getEnvVar(
      "STRAVA_CLIENT_ID",
      isDev ? "dev-placeholder" : undefined,
    ),
    clientSecret: getEnvVar(
      "STRAVA_CLIENT_SECRET",
      isDev ? "dev-placeholder" : undefined,
    ),
    redirectUri: getEnvVar(
      "STRAVA_REDIRECT_URI",
      "http://localhost:3000/strava/auth/callback",
    ),
  },

  // Encryption for storing tokens - use dev key if not set
  encryptionKey: getEnvVar(
    "ENCRYPTION_KEY",
    isDev
      ? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      : undefined,
  ),

  // Frontend URL for OAuth redirects
  frontendUrl: getEnvVar("FRONTEND_URL", "http://localhost:5173"),

  // Database URL (reuses @agent/db connection)
  databaseUrl: getEnvVar(
    "DATABASE_URL",
    isDev ? "postgresql://agent:devpassword@localhost:5433/agent" : undefined,
  ),

  // Whether Strava integration is properly configured
  isStravaConfigured: Boolean(
    process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET,
  ),
};
