import { postAuthRefresh, postAuthLogout } from '@api/sdk';

const ACCESS_TOKEN_KEY = 'access_token';

function decodeToken(token: string): { exp?: number; email?: string; type?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export function isTokenExpired(token: string, bufferSeconds = 300): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) {
    return true;
  }

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp - now < bufferSeconds;
}

export function getTokenTimeToExpiry(token: string): number | null {
  const decoded = decodeToken(token);
  if (!decoded?.exp) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, decoded.exp - now);
}

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await postAuthRefresh({
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) {
        clearTokens();
        return false;
      }

      if (response.data?.access_token) {
        setAccessToken(response.data.access_token);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function ensureValidToken(): Promise<string | null> {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token, 300)) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      return null;
    }
    return getAccessToken();
  }

  return token;
}

export async function logout(): Promise<void> {
  try {
    const token = getAccessToken();
    if (token) {
      await postAuthLogout({
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearTokens();
  }
}
