import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../service/dist/openapi.json",
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
