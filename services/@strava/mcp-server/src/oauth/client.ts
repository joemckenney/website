import { Strava } from "arctic";
import { config } from "../config.js";

/**
 * Create a Strava OAuth client using Arctic
 */
export function createStravaClient(): Strava {
  return new Strava(
    config.strava.clientId,
    config.strava.clientSecret,
    config.strava.redirectUri,
  );
}

/**
 * Token response from Strava OAuth
 */
export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete: {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
  };
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<StravaTokenResponse> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.strava.clientId,
      client_secret: config.strava.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava token exchange failed: ${error}`);
  }

  return response.json() as Promise<StravaTokenResponse>;
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<Omit<StravaTokenResponse, "athlete">> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.strava.clientId,
      client_secret: config.strava.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava token refresh failed: ${error}`);
  }

  return response.json() as Promise<Omit<StravaTokenResponse, "athlete">>;
}
