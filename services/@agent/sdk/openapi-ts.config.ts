import { defineConfig } from "@hey-api/openapi-ts";
import spec from "@agent/spec";

export default defineConfig({
  input: spec,
  output: {
    path: "./src/generated",
    importFileExtension: ".js",
  },
  client: "@hey-api/client-fetch",
  plugins: [
    {
      name: "@hey-api/typescript",
      enums: "javascript",
    },
    {
      name: "@hey-api/sdk",
      asClass: false,
    },
  ],
});
