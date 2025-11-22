import { client as apiClient } from "@api/sdk";
import { client as authClient } from "@auth/sdk";
import {
  clearTokens,
  ensureValidToken,
  getAccessToken,
  refreshAccessToken,
} from "./auth";

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

// Configure both SDK clients with interceptors
export function setupApiClients(apiUrl: string, authUrl: string) {
  // Configure Auth client
  authClient.setConfig({
    baseUrl: authUrl,
    credentials: "include", // Send cookies for refresh token
  });

  // Configure API client
  apiClient.setConfig({
    baseUrl: apiUrl,
    credentials: "include", // Send cookies if needed
  });

  // Request interceptor for API client - Add auth token to every request (with proactive refresh)
  apiClient.interceptors.request.use(async (request, options) => {
    // Check if endpoint requires authentication based on OpenAPI security metadata
    const requiresAuth =
      options?.security &&
      Array.isArray(options.security) &&
      options.security.length > 0;

    if (!requiresAuth) {
      return request;
    }

    const token = await ensureValidToken();

    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }

    return request;
  });

  // Response interceptor for API client - Handle 401s automatically with token refresh and retry
  apiClient.interceptors.response.use(async (response, request, options) => {
    if (response.status !== 401) {
      return response;
    }

    // Only retry for endpoints that require authentication (based on OpenAPI security metadata)
    const requiresAuth =
      options?.security &&
      Array.isArray(options.security) &&
      options.security.length > 0;
    if (!requiresAuth) {
      return response;
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        addRefreshSubscriber(async (token) => {
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
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
          request.headers.set("Authorization", `Bearer ${newToken}`);
          return await fetch(request);
        }
      } else {
        isRefreshing = false;
        onRefreshed(null);
        clearTokens();
        window.location.href = "/";
        return response;
      }
    } catch (_error) {
      isRefreshing = false;
      onRefreshed(null);
      clearTokens();
      window.location.href = "/";
      return response;
    }

    return response;
  });
}
