import { postAuthRefresh, postAuthLogout, client } from '@app/sdk';

const ACCESS_TOKEN_KEY = 'access_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  // Note: refresh token is now an httpOnly cookie managed by the server
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    // No need to send refresh token - it's automatically sent as httpOnly cookie
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
  }
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
