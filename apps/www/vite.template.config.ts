import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/template.ts"),
      formats: ["es"],
      fileName: "index",
    },
  },
});
