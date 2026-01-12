import { ensureValidToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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

  const response = await fetch(`${API_URL}/strava/auth/connect`, {
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
