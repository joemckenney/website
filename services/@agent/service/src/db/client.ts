import { createPrismaClient } from "@agent/db";

// Create a single PrismaClient instance with the pg adapter
export const prisma = createPrismaClient();

// Serialize dates to ISO strings for API responses
export function serializeConversation(conversation: {
  id: string;
  userId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...conversation,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  };
}

export function serializeMessage(message: {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: unknown;
  toolResults: unknown;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as "user" | "assistant" | "tool",
    content: message.content,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
    model: message.model,
    inputTokens: message.inputTokens,
    outputTokens: message.outputTokens,
    createdAt: message.createdAt.toISOString(),
  };
}
