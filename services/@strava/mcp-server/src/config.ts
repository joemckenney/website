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

// Environment types for OAuth redirect routing
export type Environment = "local" | "minikube" | "prod";

// Frontend URLs for each environment - used for OAuth redirect routing
// All OAuth callbacks go through prod, then redirect to the appropriate frontend
const environmentFrontendUrls: Record<Environment, string> = {
  local: "http://localhost:5173",
  minikube: "http://app.local.com",
  prod: "https://app.joemckenney.com",
};

// Validate and get frontend URL for an environment
export function getFrontendUrl(env: string | undefined): string {
  if (env && env in environmentFrontendUrls) {
    return environmentFrontendUrls[env as Environment];
  }
  // Fallback to configured FRONTEND_URL or default
  return getEnvVar("FRONTEND_URL", "http://localhost:5173");
}

// Check if an environment string is valid
export function isValidEnvironment(
  env: string | undefined,
): env is Environment {
  return env !== undefined && env in environmentFrontendUrls;
}

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

  // Frontend URL for OAuth redirects (default/fallback)
  frontendUrl: getEnvVar("FRONTEND_URL", "http://localhost:5173"),

  // All valid frontend URLs for security validation
  allowedFrontendUrls: Object.values(environmentFrontendUrls),

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
