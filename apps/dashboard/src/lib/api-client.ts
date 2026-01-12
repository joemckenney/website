import { client as agentClient } from "@agent/sdk";
import { client } from "@gateway/sdk";
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
  for (const callback of refreshSubscribers) {
    callback(token);
  }
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string | null) => void) {
  refreshSubscribers.push(callback);
}

// Configure the SDK clients with interceptors
export function setupApiClient(baseUrl: string) {
  // Gateway SDK client
  client.setConfig({
    baseUrl,
    credentials: "include", // Send cookies for refresh token
  });

  // Agent SDK client - routes through gateway at /agent/*
  agentClient.setConfig({
    baseUrl: `${baseUrl}/agent`,
    credentials: "include",
  });

  // Request interceptor - Add auth token to every request (with proactive refresh)
  client.interceptors.request.use(async (request, options) => {
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

  // Response interceptor - Handle 401s automatically with token refresh and retry
  client.interceptors.response.use(async (response, request, options) => {
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

  // Agent client request interceptor - Add auth token
  agentClient.interceptors.request.use(async (request) => {
    const token = await ensureValidToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  });
}
