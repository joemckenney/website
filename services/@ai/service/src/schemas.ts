import { Type } from "@fastify/type-provider-typebox";

/**
 * Messages are accepted as opaque UIMessage-shaped objects produced by
 * @ai-sdk/react's useChat. The server converts them to model messages via
 * convertToModelMessages before invoking streamText. We don't constrain the
 * shape here — the SDK owns that contract and it has churned across versions.
 */
export const ChatRequest = Type.Object({
  model: Type.String({
    description: "Provider-prefixed model id, e.g. anthropic/claude-sonnet-4-5",
  }),
  messages: Type.Array(Type.Any()),
});

export const ModelInfo = Type.Object({
  id: Type.String(),
  provider: Type.String(),
});

export const ModelsResponse = Type.Object({
  models: Type.Array(ModelInfo),
});

export const ErrorResponse = Type.Object({
  error: Type.String(),
});
