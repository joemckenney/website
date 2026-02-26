import "@crow/theme/styles";
import { Routes } from "@generouted/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setupApiClient } from "./lib/api-client";
import { setAccessToken } from "./lib/auth";

// Extract OAuth token from URL before React renders.
// The OAuth callback redirects to /?access_token=TOKEN. If we don't capture
// it here, the root layout's auth check will redirect to /login before any
// child page can extract it.
const params = new URLSearchParams(window.location.search);
const callbackToken = params.get("access_token");
const callbackError = params.get("error");

if (callbackToken) {
  setAccessToken(callbackToken);
  window.history.replaceState({}, "", window.location.pathname);
} else if (callbackError) {
  window.history.replaceState(
    {},
    "",
    `/login?error=${encodeURIComponent(callbackError)}`,
  );
}

// Configure SDK clients before rendering
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
setupApiClient(API_URL);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Routes />
  </StrictMode>,
);
