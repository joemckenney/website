import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  // Bundle everything except the runtime client-fetch dependency
  external: ["@hey-api/client-fetch"],
});
