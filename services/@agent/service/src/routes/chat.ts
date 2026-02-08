import type { AgentStreamResult, McpServerConfig } from "@agent/core";
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

      // Check for table context header (set by chat panel in dashboard)
      const tableId = request.headers["x-table-id"] as string | undefined;
      const tableName = request.headers["x-table-name"] as string | undefined;
      const tableColumns = request.headers["x-table-columns"] as
        | string
        | undefined;

      console.log(`[Chat] ====== Table Context Headers ======`);
      console.log(`[Chat] x-table-id: ${tableId}`);
      console.log(`[Chat] x-table-name: ${tableName}`);
      console.log(`[Chat] x-table-columns: ${tableColumns}`);

      // Build MCP servers config conditionally
      const mcpServers: Record<string, McpServerConfig> = {};

      if (tableId) {
        const tablesUrl = `${config.tablesServiceUrl}/mcp/sse`;
        console.log(`[Chat] Adding Tables MCP server: ${tablesUrl}`);
        mcpServers.tables = {
          type: "sse",
          url: tablesUrl,
          headers: { "x-user-id": user.id, "x-table-id": tableId },
        };
      }

      // Create agent with Agent SDK
      // The Agent SDK handles tool execution internally
      const hasMcpServers = Object.keys(mcpServers).length > 0;
      console.log(`[Chat] ====== Creating Agent ======`);
      console.log(`[Chat] Has MCP servers: ${hasMcpServers}`);
      console.log(`[Chat] MCP server names:`, Object.keys(mcpServers));
      console.log(
        `[Chat] Full MCP config:`,
        JSON.stringify(mcpServers, null, 2),
      );

      // Build system prompt with table context if available
      let systemPrompt = config.agent.systemPrompt;
      if (tableId) {
        systemPrompt += `\n\nIMPORTANT: You are working with the user's data table "${tableName || "current table"}".`;
        if (tableColumns) {
          systemPrompt += ` Current columns: ${tableColumns}.`;
        }
        systemPrompt += `

You have MCP tools to work with this table. All tools automatically operate on the current table - you don't need to specify a table ID.

Available tools:
- get-table-schema: See all columns in this table
- query-rows: Get rows (with optional limit/offset for pagination)
- insert-row: Add a new row (optionally with initial data)
- update-cell: Update a cell (requires rowId, columnId, and value)
- delete-rows: Delete rows (requires array of rowIds)
- add-column: Add a column (requires name and dataType: text/number/boolean/date/select)
- rename-column: Rename a column (requires columnId and new name)
- delete-column: Remove a column (requires columnId)

When the user asks to add rows, columns, update data, or query the table, use these tools immediately. This is a database table - do NOT ask for file paths.`;
      }

      const agent = createAgent(
        {
          model: config.agent.model,
          maxTokens: config.agent.maxTokens,
          systemPrompt,
        },
        {
          allowedTools: ["WebSearch"],
          permissionMode: "bypassPermissions",
          ...(hasMcpServers && { mcpServers }),
        },
      );

      let _assistantContent = "";
      let newSessionId: string | undefined;

      try {
        // Stream response from agent
        // For continuing conversations, pass the sessionId to resume context
        const stream = agent.stream(message, {
          userId: user.id,
          conversationId: id,
          sessionId: conversation.sessionId ?? undefined,
        });

        let streamResult: IteratorResult<any, AgentStreamResult> =
          await stream.next();
        while (!streamResult.done) {
          const event = streamResult.value;

          // Write SSE event
          reply.raw.write(formatSSE(event));

          // Track content for saving
          if (event.type === "text_delta") {
            _assistantContent += event.text;
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

          streamResult = await stream.next();
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
