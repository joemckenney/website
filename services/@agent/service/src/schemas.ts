import { type Static, Type } from "typebox";

/**
 * Message schema
 */
export const Message = Type.Object({
  id: Type.String({ description: "Message ID (UUID)" }),
  conversationId: Type.String({ description: "Conversation ID" }),
  role: Type.Union([
    Type.Literal("user"),
    Type.Literal("assistant"),
    Type.Literal("tool"),
  ]),
  content: Type.String({ description: "Message content" }),
  toolCalls: Type.Optional(Type.Any({ description: "Tool calls made" })),
  toolResults: Type.Optional(Type.Any({ description: "Tool results" })),
  model: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  inputTokens: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  outputTokens: Type.Optional(Type.Union([Type.Number(), Type.Null()])),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
});
export type MessageType = Static<typeof Message>;

/**
 * Conversation schema
 */
export const Conversation = Type.Object({
  id: Type.String({ description: "Conversation ID (UUID)" }),
  userId: Type.String({ description: "User ID" }),
  title: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  createdAt: Type.String({ description: "Creation timestamp (ISO 8601)" }),
  updatedAt: Type.String({ description: "Last update timestamp (ISO 8601)" }),
});
export type ConversationType = Static<typeof Conversation>;

/**
 * Conversation with messages
 */
export const ConversationWithMessages = Type.Object({
  ...Conversation.properties,
  messages: Type.Array(Message),
});
export type ConversationWithMessagesType = Static<
  typeof ConversationWithMessages
>;

/**
 * Create conversation request
 */
export const CreateConversationBody = Type.Object({
  title: Type.Optional(Type.String({ description: "Conversation title" })),
});
export type CreateConversationBodyType = Static<typeof CreateConversationBody>;

/**
 * Update conversation request
 */
export const UpdateConversationBody = Type.Object({
  title: Type.Optional(
    Type.Union([Type.String(), Type.Null()], {
      description: "Conversation title",
    })
  ),
});
export type UpdateConversationBodyType = Static<typeof UpdateConversationBody>;

/**
 * Chat request body
 */
export const ChatRequestBody = Type.Object({
  message: Type.String({ description: "User message to send" }),
});
export type ChatRequestBodyType = Static<typeof ChatRequestBody>;

/**
 * Path parameters
 */
export const ConversationIdParams = Type.Object({
  id: Type.String({ description: "Conversation ID" }),
});
export type ConversationIdParamsType = Static<typeof ConversationIdParams>;

/**
 * List conversations query
 */
export const ListConversationsQuery = Type.Object({
  limit: Type.Optional(
    Type.Number({ description: "Maximum results", default: 50 })
  ),
  offset: Type.Optional(Type.Number({ description: "Offset", default: 0 })),
});
export type ListConversationsQueryType = Static<typeof ListConversationsQuery>;

/**
 * Response schemas
 */
export const ErrorResponse = Type.Object({
  error: Type.String({ description: "Error message" }),
});
export type ErrorResponseType = Static<typeof ErrorResponse>;

export const HealthResponse = Type.Object({
  status: Type.String({ description: "Health status" }),
  timestamp: Type.String({ description: "Current timestamp" }),
});
export type HealthResponseType = Static<typeof HealthResponse>;

export const ConversationList = Type.Object({
  conversations: Type.Array(Conversation),
  total: Type.Number({ description: "Total count" }),
});
export type ConversationListType = Static<typeof ConversationList>;
