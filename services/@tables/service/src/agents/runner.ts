import Anthropic from "@anthropic-ai/sdk";
import type { TableAgent } from "@tables/db";
import { config } from "../config.js";
import { prisma } from "../db/client.js";
import type { TableEvent } from "../lib/events.js";
import { memoryStore } from "../store/memory.js";

/**
 * Agent Runner
 *
 * Subscribes to table events and triggers matching agents.
 * When an agent fires, it calls the Anthropic API to generate
 * values for output columns, then emits CELL_UPDATED events
 * with originAgentId set to prevent infinite loops.
 */
class AgentRunner {
  private subscriptions = new Map<string, () => void>();
  private activeExecutions = new Set<string>();
  private client: Anthropic | null = null;

  /**
   * Start the runner: subscribe to all tables that have enabled agents
   */
  async start(): Promise<void> {
    if (!config.anthropicApiKey) {
      console.log(
        "[AgentRunner] No ANTHROPIC_API_KEY set, agent runner disabled",
      );
      return;
    }

    this.client = new Anthropic({ apiKey: config.anthropicApiKey });

    const tablesWithAgents = await prisma.tableAgent.findMany({
      where: { enabled: true },
      select: { tableId: true },
      distinct: ["tableId"],
    });

    for (const { tableId } of tablesWithAgents) {
      this.subscribeToTable(tableId);
    }

    console.log(
      `[AgentRunner] Started with ${tablesWithAgents.length} table subscriptions`,
    );
  }

  /**
   * Lazily initialize the Anthropic client
   */
  private ensureClient(): Anthropic | null {
    if (this.client) return this.client;
    if (!config.anthropicApiKey) {
      return null;
    }
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
    return this.client;
  }

  /**
   * Subscribe to events for a table
   */
  subscribeToTable(tableId: string): void {
    if (this.subscriptions.has(tableId)) return;

    const unsubscribe = memoryStore.subscribe(tableId, (event) => {
      this.handleEvent(event).catch((err) => {
        console.error("[AgentRunner] Error handling event:", err);
      });
    });

    this.subscriptions.set(tableId, unsubscribe);
    console.log(`[AgentRunner] Subscribed to table ${tableId}`);
  }

  /**
   * Unsubscribe from a table if no more enabled agents exist
   */
  async unsubscribeIfEmpty(tableId: string): Promise<void> {
    const count = await prisma.tableAgent.count({
      where: { tableId, enabled: true },
    });

    if (count === 0) {
      const unsub = this.subscriptions.get(tableId);
      if (unsub) {
        unsub();
        this.subscriptions.delete(tableId);
      }
    }
  }

  /**
   * Stop the runner and clean up all subscriptions
   */
  stop(): void {
    for (const unsub of this.subscriptions.values()) {
      unsub();
    }
    this.subscriptions.clear();
    this.activeExecutions.clear();
    console.log("[AgentRunner] Stopped");
  }

  /**
   * Handle an incoming table event
   */
  private async handleEvent(event: TableEvent): Promise<void> {
    // Skip events originating from an agent (prevent loops)
    if (
      (event.type === "CELL_UPDATED" || event.type === "ROW_INSERTED") &&
      event.originAgentId
    ) {
      console.log(
        `[AgentRunner] Skipping event from agent ${event.originAgentId}`,
      );
      return;
    }

    if (event.type !== "ROW_INSERTED" && event.type !== "CELL_UPDATED") {
      return;
    }

    console.log(
      `[AgentRunner] Received ${event.type} for table ${event.tableId}`,
      event.type === "CELL_UPDATED"
        ? `columnId=${event.columnId}`
        : `keys=${Object.keys(event.data).join(",")}`,
    );

    if (!this.ensureClient()) {
      console.warn(
        "[AgentRunner] No Anthropic client — set ANTHROPIC_API_KEY and restart",
      );
      return;
    }

    const agents = await prisma.tableAgent.findMany({
      where: { tableId: event.tableId, enabled: true },
    });

    console.log(
      `[AgentRunner] Found ${agents.length} enabled agents for table`,
    );

    for (const agent of agents) {
      const matches = this.evaluateTrigger(agent, event);
      console.log(
        `[AgentRunner] Agent "${agent.name}" (${agent.triggerType}, watchColumns=${agent.watchColumns.join(",")}) → ${matches ? "MATCH" : "no match"}`,
      );
      if (matches) {
        this.executeAgent(agent, event).catch((err) => {
          console.error(
            `[AgentRunner] Error executing agent ${agent.id}:`,
            err,
          );
        });
      }
    }
  }

  /**
   * Check if an agent's trigger matches the event
   */
  private evaluateTrigger(agent: TableAgent, event: TableEvent): boolean {
    if (
      agent.triggerType === "on_row_insert" &&
      event.type === "ROW_INSERTED"
    ) {
      // Check that input columns have non-null values
      return agent.inputColumns.some((colId) => {
        const val = event.data[colId];
        return val !== null && val !== undefined && val !== "";
      });
    }

    if (
      agent.triggerType === "on_cell_update" &&
      event.type === "CELL_UPDATED"
    ) {
      return agent.watchColumns.includes(event.columnId);
    }

    return false;
  }

  /**
   * Execute an agent: call the LLM and write output columns
   */
  private async executeAgent(
    agent: TableAgent,
    event: TableEvent,
  ): Promise<void> {
    const client = this.ensureClient();
    if (!client) return;

    const rowId =
      event.type === "ROW_INSERTED" ? event.rowId : (event as any).rowId;
    const dedupKey = `${agent.id}:${rowId}`;

    // Deduplicate concurrent executions
    if (this.activeExecutions.has(dedupKey)) return;
    this.activeExecutions.add(dedupKey);

    try {
      const table = memoryStore.getTable(event.tableId);
      if (!table) return;

      // Validate referenced columns still exist
      const missingInputs = agent.inputColumns.filter(
        (col) => !table.columns.has(col),
      );
      const missingOutputs = agent.outputColumns.filter(
        (col) => !table.columns.has(col),
      );

      if (missingInputs.length > 0 || missingOutputs.length > 0) {
        console.warn(
          `[AgentRunner] Agent ${agent.id} references missing columns, skipping`,
        );
        return;
      }

      // Read the current row data
      const row = memoryStore.getRow(event.tableId, rowId);
      if (!row) return;

      // Build input context with human-readable column names
      const inputContext: Record<string, unknown> = {};
      for (const colId of agent.inputColumns) {
        const col = table.columns.get(colId);
        if (col) {
          inputContext[col.name] = row.data[colId];
        }
      }

      // Build output schema description
      const outputSchema: Record<string, string> = {};
      for (const colId of agent.outputColumns) {
        const col = table.columns.get(colId);
        if (col) {
          outputSchema[col.name] = col.dataType;
        }
      }

      const systemPrompt = `You are a data automation agent. Your job is to fill in missing data based on the user's instructions.

Instructions: ${agent.prompt}

You must respond with ONLY a JSON object mapping column names to values. The output columns and their types are:
${Object.entries(outputSchema)
  .map(([name, type]) => `- "${name}" (${type})`)
  .join("\n")}

Respond with valid JSON only, no explanation or markdown.`;

      const userMessage = `Input data:\n${JSON.stringify(inputContext, null, 2)}`;

      console.log(
        `[AgentRunner] Executing agent "${agent.name}" for row ${rowId}`,
      );

      const response = await client.messages.create({
        model: config.agentModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      // Parse the response
      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") return;

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(textBlock.text);
      } catch {
        console.error(
          `[AgentRunner] Failed to parse LLM response for agent ${agent.id}:`,
          textBlock.text,
        );
        return;
      }

      // Map column names back to IDs and emit CELL_UPDATED events
      const nameToId = new Map<string, string>();
      for (const colId of agent.outputColumns) {
        const col = table.columns.get(colId);
        if (col) {
          nameToId.set(col.name, colId);
        }
      }

      for (const [name, value] of Object.entries(parsed)) {
        const colId = nameToId.get(name);
        if (colId && value !== null && value !== undefined) {
          await memoryStore.applyEvent({
            type: "CELL_UPDATED",
            tableId: event.tableId,
            rowId,
            columnId: colId,
            value,
            originAgentId: agent.id,
          });
        }
      }

      console.log(
        `[AgentRunner] Agent "${agent.name}" completed for row ${rowId}`,
      );
    } finally {
      this.activeExecutions.delete(dedupKey);
    }
  }
}

export const agentRunner = new AgentRunner();
