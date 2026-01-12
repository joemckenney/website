import type { ConversationMessage } from "@agent/core";
import { createAgent, formatSSE, SSE_HEADERS } from "@agent/core";
import type { MessageRole } from "@agent/db";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { createToolRegistry } from "@tools/core";
import { webSearchTool } from "@tools/web-search";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { prisma, serializeMessage } from "../db/client.js";
import { authMiddleware, getUser } from "../lib/auth.js";
import {
  ChatRequestBody,
  ConversationIdParams,
  ErrorResponse,
} from "../schemas.js";

// Create tool registry with available tools
const toolRegistry = createToolRegistry([webSearchTool]);

export async function registerChatRoutes(
  app: FastifyInstance & { withTypeProvider: () => FastifyInstance },
) {
  const fastify = app.withTypeProvider<TypeBoxTypeProvider>();

  // Chat endpoint with SSE streaming
  fastify.post(
    "/conversations/:id/chat",
    {
      preHandler: authMiddleware,
      schema: {
        operationId: "chat",
        description:
          "Send a message and stream the agent response via Server-Sent Events",
        tags: ["chat"],
        params: ConversationIdParams,
        body: ChatRequestBody,
        response: {
          // SSE doesn't fit OpenAPI well, but we document possible errors
          401: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (request, reply) => {
      const user = getUser(request);
      const { id } = request.params;
      const { message } = request.body;

      // Verify conversation exists and belongs to user
      const conversation = await prisma.conversation.findFirst({
        where: { id, userId: user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }

      // Set SSE headers
      reply.raw.writeHead(200, SSE_HEADERS);

      // Save user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: id,
          role: "user" as MessageRole,
          content: message,
        },
      });

      // Convert DB messages to agent format
      const conversationMessages: ConversationMessage[] =
        conversation.messages.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          toolCalls:
            msg.toolCalls as unknown as ConversationMessage["toolCalls"],
          toolResults:
            msg.toolResults as unknown as ConversationMessage["toolResults"],
        }));

      // Add the new user message
      conversationMessages.push({
        role: "user",
        content: message,
      });

      // Create agent and stream response
      const agent = createAgent(toolRegistry, {
        model: config.agent.model,
        maxTokens: config.agent.maxTokens,
        systemPrompt: config.agent.systemPrompt,
      });

      let assistantContent = "";

      try {
        for await (const event of agent.stream(conversationMessages, {
          userId: user.id,
          conversationId: id,
        })) {
          // Write SSE event
          reply.raw.write(formatSSE(event));

          // Track content for saving
          if (event.type === "text_delta") {
            assistantContent += event.text;
          } else if (event.type === "message_complete") {
            // Save assistant message to database
            const assistantMessage = await prisma.message.create({
              data: {
                conversationId: id,
                role: "assistant" as MessageRole,
                content: event.message.content,
                toolCalls:
                  event.message.toolCalls && event.message.toolCalls.length > 0
                    ? (event.message.toolCalls as unknown as Parameters<
                        typeof prisma.message.create
                      >[0]["data"]["toolCalls"])
                    : undefined,
                model: config.agent.model,
              },
            });

            // Update conversation title if this is the first message
            if (conversation.messages.length === 0 && !conversation.title) {
              // Generate a title from the first user message
              const title =
                message.length > 50 ? `${message.slice(0, 47)}...` : message;
              await prisma.conversation.update({
                where: { id },
                data: { title },
              });
            }

            // Update conversation timestamp
            await prisma.conversation.update({
              where: { id },
              data: { updatedAt: new Date() },
            });
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        reply.raw.write(formatSSE({ type: "error", error: errorMessage }));
      }

      reply.raw.end();
    },
  );
}
