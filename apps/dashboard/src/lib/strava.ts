import { ensureValidToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Environment for OAuth redirect routing (local, minikube, or prod)
// Defaults based on API URL if not explicitly set
function getEnvironment(): "local" | "minikube" | "prod" {
  const env = import.meta.env.VITE_ENV;
  if (env === "local" || env === "minikube" || env === "prod") {
    return env;
  }
  // Infer from API URL
  if (API_URL.includes("localhost")) return "local";
  if (API_URL.includes(".local.com")) return "minikube";
  return "prod";
}

interface StravaStatus {
  connected: boolean;
  configured?: boolean;
  athleteId?: string;
  athleteName?: string;
}

export async function getStravaStatus(): Promise<StravaStatus> {
  const token = await ensureValidToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/strava/auth/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 404) {
      return { connected: false };
    }
    throw new Error("Failed to get Strava status");
  }

  return response.json();
}

export async function getStravaAuthUrl(): Promise<string> {
  const token = await ensureValidToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  // Pass environment for OAuth redirect routing back to correct frontend
  const env = getEnvironment();
  const response = await fetch(`${API_URL}/strava/auth/connect?env=${env}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to get Strava auth URL");
  }

  const data = await response.json();
  return data.authUrl;
}

export async function disconnectStrava(): Promise<void> {
  const token = await ensureValidToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/strava/auth/disconnect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to disconnect Strava");
  }
}
