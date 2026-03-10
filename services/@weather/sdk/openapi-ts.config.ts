import spec from "@weather/spec";
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: spec,
  output: "./src/generated",
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
