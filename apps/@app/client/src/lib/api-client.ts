import { client } from '@app/sdk';
import { ensureValidToken } from './auth';

// Configure the SDK client
export function setupApiClient(baseUrl: string) {
  client.setConfig({
    baseUrl,
    credentials: 'include', // Send cookies for refresh token
  });
}

// Helper to get auth headers with a valid token (proactive refresh)
export async function getAuthHeaders(): Promise<{ Authorization?: string }> {
  const token = await ensureValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
