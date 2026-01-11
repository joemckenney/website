import "@crow/theme/styles";
import { Routes } from "@generouted/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { setupApiClient } from "./lib/api-client";

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
