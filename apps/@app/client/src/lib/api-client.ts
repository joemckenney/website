import { client } from '@app/sdk';
import { ensureValidToken, refreshAccessToken, getAccessToken, clearTokens } from './auth';

// Track if we're currently refreshing to prevent loops
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

// Configure the SDK client with interceptors
export function setupApiClient(baseUrl: string) {
  client.setConfig({
    baseUrl,
    credentials: 'include', // Send cookies for refresh token
  });

  // Request interceptor - Add auth token to every request (with proactive refresh)
  client.interceptors.request.use(async (request, options) => {
    // Skip auth for public endpoints and auth management endpoints
    const url = options?.url || '';
    if (url.includes('/auth/google') || url.includes('/auth/refresh') || url.includes('/auth/logout') || url.includes('/ping')) {
      return request;
    }

    const token = await ensureValidToken();

    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    return request;
  });

  // Response interceptor - Handle 401s automatically with token refresh and retry
  client.interceptors.response.use(async (response, request, options) => {
    if (response.status !== 401) {
      return response;
    }

    // Don't try to refresh on auth endpoints
    const url = options?.url || '';
    if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return response;
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(async (token) => {
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
            try {
              const retryResponse = await fetch(request);
              resolve(retryResponse);
            } catch (error) {
              reject(error);
            }
          } else {
            resolve(response);
          }
        });
      });
    }

    // Start refresh process
    isRefreshing = true;

    try {
      const refreshed = await refreshAccessToken();

      if (refreshed) {
        const newToken = getAccessToken();
        isRefreshing = false;
        onRefreshed(newToken);

        if (newToken) {
          request.headers.set('Authorization', `Bearer ${newToken}`);
          return await fetch(request);
        }
      } else {
        isRefreshing = false;
        onRefreshed(null);
        clearTokens();
        window.location.href = '/';
        return response;
      }
    } catch (error) {
      isRefreshing = false;
      onRefreshed(null);
      clearTokens();
      window.location.href = '/';
      return response;
    }

    return response;
  });
}
