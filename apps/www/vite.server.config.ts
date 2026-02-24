import { resolve } from "node:path";
import { defineConfig } from "vite";

import viteConfiguration from "./vite.config";

export default defineConfig({
  ...viteConfiguration,
  build: {
    lib: {
      entry: resolve(__dirname, "src/entry-server.tsx"),
      formats: ["es"],
      fileName: "index",
    },
    emptyOutDir: false,
    rollupOptions: {
      output: {
        assetFileNames: "[name].[ext]",
      },
    },
  },
  plugins: [...(viteConfiguration.plugins || [])],
});
