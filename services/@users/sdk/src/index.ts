export { client } from "./generated/client.gen.js";
export * from "./generated/index.js";

// Namespace export for userService.method() pattern
import * as api from "./generated/sdk.gen.js";
export const userService = api;
