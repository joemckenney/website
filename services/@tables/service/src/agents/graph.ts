import { prisma } from "../db/client.js";

/**
 * Agent Dependency Graph
 *
 * Validates that adding/updating an agent won't create a cycle
 * in the column dependency DAG. Each agent reads from inputColumns
 * and writes to outputColumns — if agent A's outputs feed agent B's
 * inputs, that's an edge A→B. Cycles would cause infinite loops.
 */
export class AgentDependencyGraph {
  /**
   * Check if the proposed agent would create a cycle.
   * Returns an error message if a cycle is detected, null if safe.
   *
   * @param tableId - The table these agents belong to
   * @param agentId - The agent being created/updated (null for new agents)
   * @param inputColumns - Column IDs the agent reads from
   * @param outputColumns - Column IDs the agent writes to
   */
  async validateNoCycle(
    tableId: string,
    agentId: string | null,
    inputColumns: string[],
    outputColumns: string[],
  ): Promise<string | null> {
    // Self-loop check: reject if input and output columns overlap
    const overlap = inputColumns.filter((col) => outputColumns.includes(col));
    if (overlap.length > 0) {
      return `Agent cannot read and write the same columns: ${overlap.join(", ")}`;
    }

    // Load all enabled agents for this table (excluding the one being updated)
    const agents = await prisma.tableAgent.findMany({
      where: {
        tableId,
        enabled: true,
        ...(agentId ? { NOT: { id: agentId } } : {}),
      },
    });

    // Build adjacency list: if A.outputColumns ∩ B.inputColumns is non-empty, edge A→B
    // Include the proposed agent as a virtual node
    const proposedId = agentId ?? "__proposed__";
    const allAgents = [
      ...agents.map((a) => ({
        id: a.id,
        inputColumns: a.inputColumns,
        outputColumns: a.outputColumns,
      })),
      { id: proposedId, inputColumns, outputColumns },
    ];

    // Check for overlapping output columns between agents
    for (const other of agents) {
      const outputOverlap = outputColumns.filter((col) =>
        other.outputColumns.includes(col),
      );
      if (outputOverlap.length > 0) {
        return `Output columns overlap with agent "${other.name}": ${outputOverlap.join(", ")}`;
      }
    }

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const a of allAgents) {
      adjacency.set(a.id, []);
    }

    for (const a of allAgents) {
      for (const b of allAgents) {
        if (a.id === b.id) continue;
        // Edge A→B exists if A's outputs feed B's inputs
        const feeds = a.outputColumns.some((col) =>
          b.inputColumns.includes(col),
        );
        if (feeds) {
          adjacency.get(a.id)!.push(b.id);
        }
      }
    }

    // DFS cycle detection
    const WHITE = 0;
    const GRAY = 1;
    const BLACK = 2;
    const color = new Map<string, number>();
    for (const id of adjacency.keys()) {
      color.set(id, WHITE);
    }

    const hasCycle = (nodeId: string): boolean => {
      color.set(nodeId, GRAY);
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        if (color.get(neighbor) === GRAY) return true;
        if (color.get(neighbor) === WHITE && hasCycle(neighbor)) return true;
      }
      color.set(nodeId, BLACK);
      return false;
    };

    for (const id of adjacency.keys()) {
      if (color.get(id) === WHITE && hasCycle(id)) {
        return "Adding this agent would create a circular dependency between agents";
      }
    }

    return null;
  }
}

export const agentGraph = new AgentDependencyGraph();
