import { client } from "@gateway/sdk";
import { ensureValidToken, getAccessToken, refreshAccessToken } from "./auth";

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

export function setupApiClient(baseUrl: string) {
  client.setConfig({
    baseUrl,
    credentials: "include",
  });

  client.interceptors.request.use(async (request, options) => {
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

  client.interceptors.response.use(async (response, request, options) => {
    if (response.status !== 401) {
      return response;
    }

    const requiresAuth =
      options?.security &&
      Array.isArray(options.security) &&
      options.security.length > 0;
    if (!requiresAuth) {
      return response;
    }

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
        window.location.href = "/login";
        return response;
      }
    } catch {
      isRefreshing = false;
      onRefreshed(null);
      window.location.href = "/login";
      return response;
    }

    return response;
  });
}
