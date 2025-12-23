import spec from "@api/spec";
import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: spec,
  output: "./src/generated",
  client: "@hey-api/client-fetch", // Specify the client to use
  plugins: [
    // TypeScript types plugin - generates type definitions
    {
      name: "@hey-api/typescript",
      enums: "javascript", // Export enums as plain objects for better typing
    },
    // SDK plugin - generates typed SDK methods
    {
      name: "@hey-api/sdk",
      asClass: false, // Generate functional SDK (not class-based)
    },
  ],
});
