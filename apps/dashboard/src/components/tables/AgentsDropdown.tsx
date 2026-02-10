import { useCallback, useEffect, useRef, useState } from "react";
import { ensureValidToken } from "../../lib/auth";
import * as styles from "../../styles/tables.css";

interface Agent {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  watchColumns: string[];
}

interface AgentsDropdownProps {
  tableId: string;
  columns: Array<{ id: string; name: string }>;
}

export function AgentsDropdown({ tableId, columns }: AgentsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchAgents = useCallback(async () => {
    const token = await ensureValidToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/tables/${tableId}/agents`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tableId]);

  const handleToggle = async (agentId: string, enabled: boolean) => {
    const token = await ensureValidToken();
    if (!token) return;

    // Optimistic update
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, enabled } : a)),
    );

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/tables/${tableId}/agents/${agentId}/toggle`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ enabled }),
        },
      );

      if (!res.ok) {
        // Revert on failure
        setAgents((prev) =>
          prev.map((a) => (a.id === agentId ? { ...a, enabled: !enabled } : a)),
        );
      }
    } catch {
      // Revert on failure
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, enabled: !enabled } : a)),
      );
    }
  };

  // Fetch agents when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen, fetchAgents]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const getTriggerLabel = (agent: Agent) => {
    if (agent.triggerType === "on_row_insert") return "On row insert";
    if (agent.triggerType === "on_cell_update") {
      const colNames = agent.watchColumns
        .map((id) => columns.find((c) => c.id === id)?.name ?? id)
        .join(", ");
      return `On update: ${colNames}`;
    }
    return agent.triggerType;
  };

  const enabledCount = agents.filter((a) => a.enabled).length;
  const buttonLabel = agents.length > 0 ? `Agents (${enabledCount})` : "Agents";

  return (
    <div className={styles.agentsDropdownWrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={() => setIsOpen(!isOpen)}
      >
        {buttonLabel}
      </button>

      {isOpen && (
        <div className={styles.agentsDropdown}>
          {isLoading ? (
            <div className={styles.agentsDropdownEmpty}>Loading...</div>
          ) : agents.length === 0 ? (
            <div className={styles.agentsDropdownEmpty}>
              No agents yet. Ask the AI assistant to create one.
            </div>
          ) : (
            agents.map((agent) => (
              <div key={agent.id} className={styles.agentsDropdownItem}>
                <div className={styles.agentsDropdownItemInfo}>
                  <span className={styles.agentsDropdownItemName}>
                    {agent.name}
                  </span>
                  <span className={styles.agentsDropdownItemTrigger}>
                    {getTriggerLabel(agent)}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.agentsDropdownToggle}
                  data-enabled={agent.enabled}
                  onClick={() => handleToggle(agent.id, !agent.enabled)}
                  title={agent.enabled ? "Disable agent" : "Enable agent"}
                >
                  <span className={styles.agentsDropdownToggleKnob} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
