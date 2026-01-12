import type {
  ConversationMessage,
  AgentStreamResult,
  McpServerConfig,
} from "@agent/core";
import { createAgent, formatSSE, SSE_HEADERS } from "@agent/core";
import type { MessageRole } from "@agent/db";
import type { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { prisma } from "../db/client.js";
import { authMiddleware, getUser } from "../lib/auth.js";
import {
  ChatRequestBody,
  ConversationIdParams,
  ErrorResponse,
} from "../schemas.js";

/**
 * Check if user has a valid Strava connection
 */
async function getStravaConnection(userId: string) {
  const connection = await prisma.stravaConnection.findUnique({
    where: { userId },
    select: {
      id: true,
      athleteId: true,
      expiresAt: true,
    },
  });

  if (!connection) {
    return null;
  }

  // Check if token is expired (Strava MCP service will refresh it)
  // We just need to know if a connection exists
  return {
    connected: true,
    athleteId: connection.athleteId,
  };
}

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
      await prisma.message.create({
        data: {
          conversationId: id,
          role: "user" as MessageRole,
          content: message,
        },
      });

      // Check if user has Strava connected
      const stravaStatus = await getStravaConnection(user.id);
      console.log(`[Chat] User ${user.id} Strava status:`, stravaStatus);

      // Build MCP servers config conditionally
      const mcpServers: Record<string, McpServerConfig> = {};
      if (stravaStatus?.connected) {
        const stravaUrl = `${config.stravaServiceUrl}/strava/mcp/sse`;
        console.log(`[Chat] Adding Strava MCP server: ${stravaUrl}`);
        mcpServers.strava = {
          type: "sse",
          url: stravaUrl,
          headers: { "x-user-id": user.id },
        };
      }

      // Create agent with Agent SDK
      // The Agent SDK handles tool execution internally
      const hasStrava = Object.keys(mcpServers).length > 0;
      console.log(`[Chat] ====== Creating Agent ======`);
      console.log(`[Chat] Has MCP servers: ${hasStrava}`);
      console.log(`[Chat] MCP server names:`, Object.keys(mcpServers));
      console.log(`[Chat] Full MCP config:`, JSON.stringify(mcpServers, null, 2));

      const agent = createAgent(
        {
          model: config.agent.model,
          maxTokens: config.agent.maxTokens,
          systemPrompt: hasStrava
            ? `${config.agent.systemPrompt}\n\nIMPORTANT: You have access to the user's Strava fitness data via MCP tools. When the user asks about their runs, activities, or fitness data, use the Strava MCP tools (get-recent-activities, get-activity-details, get-athlete-stats) instead of searching for files.`
            : config.agent.systemPrompt,
        },
        {
          allowedTools: ["WebSearch"],
          permissionMode: "bypassPermissions",
          ...(hasStrava && { mcpServers }),
        },
      );

      let assistantContent = "";
      let newSessionId: string | undefined;

      try {
        // Stream response from agent
        // For continuing conversations, pass the sessionId to resume context
        const stream = agent.stream(message, {
          userId: user.id,
          conversationId: id,
          sessionId: conversation.sessionId ?? undefined,
        });

        let streamResult: IteratorResult<any, AgentStreamResult>;
        while (!(streamResult = await stream.next()).done) {
          const event = streamResult.value;

          // Write SSE event
          reply.raw.write(formatSSE(event));

          // Track content for saving
          if (event.type === "text_delta") {
            assistantContent += event.text;
          } else if (event.type === "message_complete") {
            // Save assistant message to database
            await prisma.message.create({
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

        // Get the session ID from the generator's return value
        newSessionId = streamResult.value?.sessionId;

        // Save session ID if this is a new conversation or session changed
        if (newSessionId && newSessionId !== conversation.sessionId) {
          await prisma.conversation.update({
            where: { id },
            data: { sessionId: newSessionId },
          });
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
