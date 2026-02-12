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

/**
 * Fetch full base context (all tables + schemas) from the tables service
 * Returns a formatted string for the system prompt
 */
async function fetchBaseContext(
  baseId: string,
  activeTableId: string,
  userId: string,
): Promise<string> {
  const baseUrl = config.tablesServiceUrl;
  const headers = { "x-user-id": userId };

  // Fetch base info with table list
  const baseRes = await fetch(`${baseUrl}/bases/${baseId}`, { headers });
  if (!baseRes.ok) {
    throw new Error(`Failed to fetch base: ${baseRes.status}`);
  }
  const base = (await baseRes.json()) as {
    id: string;
    name: string;
    userId: string;
    tables: Array<{ id: string; name: string }>;
  };

  // Fetch schema for each table in parallel
  const tableSchemas = await Promise.all(
    base.tables.map(async (t) => {
      const res = await fetch(`${baseUrl}/tables/${t.id}`, { headers });
      if (!res.ok) return { ...t, columns: [] };
      const data = (await res.json()) as {
        id: string;
        name: string;
        columns: Array<{
          id: string;
          name: string;
          dataType: string;
          referencedTableId?: string;
        }>;
      };
      return data;
    }),
  );

  // Build the table-name lookup for relations
  const tableNames = new Map(base.tables.map((t) => [t.id, t.name]));

  // Format context
  const lines: string[] = [];
  lines.push(`You are working in base "${base.name}" (baseId: ${base.id}).`);
  lines.push(`Current user: ${userId}`);
  lines.push("");

  const activeTable = tableSchemas.find((t) => t.id === activeTableId);
  if (activeTable) {
    lines.push(
      `Currently viewing table: "${activeTable.name}" (tableId: ${activeTable.id})`,
    );
  }
  lines.push("");

  lines.push(`Tables in this base:`);
  for (const table of tableSchemas) {
    const colDescs = table.columns.map((c) => {
      let desc = `${c.name} (${c.dataType}, id:${c.id})`;
      if (c.referencedTableId) {
        const refName =
          tableNames.get(c.referencedTableId) || c.referencedTableId;
        desc += ` → ${refName}`;
      }
      return desc;
    });
    const marker = table.id === activeTableId ? " [active]" : "";
    lines.push(
      `- "${table.name}" (tableId: ${table.id})${marker}: ${colDescs.length > 0 ? colDescs.join(", ") : "no columns"}`,
    );
  }

  // List relationships if any
  const relations = tableSchemas.flatMap((t) =>
    t.columns
      .filter((c) => c.dataType === "relation" && c.referencedTableId)
      .map((c) => ({
        from: t.name,
        column: c.name,
        to: tableNames.get(c.referencedTableId!) || c.referencedTableId!,
      })),
  );

  if (relations.length > 0) {
    lines.push("");
    lines.push("Relationships:");
    for (const r of relations) {
      lines.push(`- ${r.from}.${r.column} → ${r.to}`);
    }
  }

  return lines.join("\n");
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

      // Check for table context headers (set by chat panel in dashboard)
      const baseId = request.headers["x-base-id"] as string | undefined;
      const tableId = request.headers["x-table-id"] as string | undefined;
      const tableName = request.headers["x-table-name"] as string | undefined;
      const tableColumns = request.headers["x-table-columns"] as
        | string
        | undefined;

      console.log(`[Chat] ====== Table Context Headers ======`);
      console.log(`[Chat] x-base-id: ${baseId}`);
      console.log(`[Chat] x-table-id: ${tableId}`);
      console.log(`[Chat] x-table-name: ${tableName}`);
      console.log(`[Chat] x-table-columns: ${tableColumns}`);

      // Build MCP servers config conditionally
      const mcpServers: Record<string, McpServerConfig> = {};

      if (tableId) {
        // Use shard-specific URL if provided by gateway (routes SSE + POST to same pod)
        const tablesShardUrl = request.headers["x-tables-shard-url"] as
          | string
          | undefined;
        const tablesBaseUrl = tablesShardUrl || config.tablesServiceUrl;
        const tablesUrl = `${tablesBaseUrl}/mcp/sse`;
        console.log(`[Chat] Adding Tables MCP server: ${tablesUrl}`);
        mcpServers.tables = {
          type: "sse",
          url: tablesUrl,
          headers: {
            "x-user-id": user.id,
            "x-table-id": tableId,
            ...(baseId ? { "x-base-id": baseId } : {}),
          },
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

      // Build system prompt with full base context
      let systemPrompt = config.agent.systemPrompt;
      if (tableId) {
        // Fetch full base context from tables service
        let baseContext = "";
        if (baseId) {
          try {
            baseContext = await fetchBaseContext(baseId, tableId, user.id);
          } catch (err) {
            console.error("[Chat] Failed to fetch base context:", err);
          }
        }

        // Fallback if base context fetch failed
        if (!baseContext) {
          baseContext = `You are working with the user's data table "${tableName || "current table"}".`;
          if (tableColumns) {
            baseContext += ` Current columns: ${tableColumns}.`;
          }
        }

        systemPrompt += `\n\n${baseContext}

You have MCP tools to work with data tables. Tools default to the active table, but you can target ANY table in the base by passing its tableId.

IMPORTANT: When the user refers to a table by name (e.g., "add rows to the Assets table"), look up the tableId from the table list above and pass it explicitly. Do NOT assume the active table is the one the user means — match the name they used.

IMPORTANT: Always create new tables in the current base — never create a new base unless the user explicitly asks for one.

Table & base management:
- list-tables: List all tables in this base with column/row counts.
- create-table: Create a new table in the current base. Requires: name. Optional: columns (array of {name, dataType}).
- rename-table: Rename a table. Requires: name. Optional: tableId (defaults to current table).
- delete-table: Delete a table. Optional: tableId (defaults to current table).
- rename-base: Rename the current base. Requires: name.
- delete-base: Delete the current base and all its tables.

Data operations:
- get-table-schema: See all columns in a table.
- query-rows: Get rows with optional pagination and sorting (limit, offset, sortBy, sortOrder).
- search-rows: Search rows with filters. Requires: filters (array of {columnId, operator, value}). Operators: eq, neq, gt, gte, lt, lte, contains, not_contains, is_empty, is_not_empty. Optional: limit, offset, sortBy, sortOrder.
- aggregate: Run an aggregation. Requires: function (count/sum/avg/min/max). Optional: columnId (required for sum/avg/min/max), filters.
- insert-row: Add a new row (optionally with initial data).
- bulk-insert: Insert multiple rows at once. Requires: rows (array of {data}).
- update-cell: Update a cell (requires rowId, columnId, and value).
- bulk-update: Update multiple cells. Requires: updates (array of {rowId, columnId, value}).
- delete-rows: Delete rows (requires array of rowIds).

Column operations:
- add-column: Add a column (requires name and dataType: text/number/boolean/date/select).
- rename-column: Rename a column (requires columnId and new name).
- delete-column: Remove a column (requires columnId).
- reorder-columns: Reorder columns (requires columnIds array in desired order).
- change-column-type: Change column type (requires columnId and newType).

When the user asks to add rows, columns, update data, or query the table, use these tools immediately. This is a database table - do NOT ask for file paths.

Agent automation tools:
- create-agent: Create an AI agent that automatically fills in columns. Requires: name, triggerType ("on_row_insert" or "on_cell_update"), inputColumns (column IDs to read), outputColumns (column IDs to write), prompt (instructions). For "on_cell_update", also provide watchColumns.
- list-agents: List all agents on this table.
- update-agent: Update an agent's configuration (requires agentId).
- delete-agent: Delete an agent (requires agentId).
- toggle-agent: Enable/disable an agent (requires agentId and enabled boolean).

When the user asks to create an automation (e.g., "auto-fill bio when name is added"), use get-table-schema first to get column IDs, then create-agent with the appropriate columns and a clear prompt.`;
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
