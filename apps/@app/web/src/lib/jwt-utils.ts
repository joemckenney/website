export interface DecodedToken {
  email: string;
  type: "access" | "refresh";
  iat: number;
  exp: number;
}

export function decodeJWT(token: string): DecodedToken | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

export function getTimeUntilExpiry(exp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const secondsRemaining = exp - now;

  if (secondsRemaining <= 0) return "Expired";

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;

  if (minutes > 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  return `${minutes}m ${seconds}s`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}
