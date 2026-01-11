export { client } from "./generated/client.gen.js";
export * from "./generated/index.js";
export type {
  ChatStreamEvent,
  ChatStreamEventData,
  ChatStreamEventType,
  StreamChatOptions,
} from "./sse.js";
// SSE streaming client
export { streamChat } from "./sse.js";

// Namespace export for agentService.method() pattern
import * as api from "./generated/sdk.gen.js";
export const agentService = api;
