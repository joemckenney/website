import generouted from "@generouted/react-router/plugin";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), generouted()],
  server: {
    port: 3001,
  },
  clearScreen: false,
});
