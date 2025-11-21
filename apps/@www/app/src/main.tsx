import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import App from "./app";

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

// Initialize PostHog
if (posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: "always",
    capture_pageview: false, // We'll manually capture in the app if needed
    capture_pageleave: true,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {posthogKey && posthogHost ? (
      <PostHogProvider client={posthog}>
        <App />
      </PostHogProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);
