import { useState } from "react";
import type { DebugInfo, ToolCallInfo } from "../hooks/useAgent";
import * as styles from "../styles/debug-panel.css";

interface DebugPanelProps {
  debugInfo: DebugInfo;
}

function ToolCallItem({ toolCall }: { toolCall: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = toolCall.endTime !== undefined;
  const duration = toolCall.endTime
    ? toolCall.endTime.getTime() - toolCall.startTime.getTime()
    : null;

  return (
    <div className={styles.toolCallItem}>
      <div
        className={styles.toolCallHeader}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={styles.toolCallName}>{toolCall.name}</span>
        <span
          className={`${styles.toolCallStatus} ${
            isComplete ? styles.toolCallStatusComplete : styles.toolCallStatusPending
          }`}
        >
          {isComplete ? `${duration}ms` : "running"}
        </span>
      </div>
      {expanded && (
        <div className={styles.toolCallDetails}>
          <div className={styles.codeLabel}>Arguments</div>
          <div className={styles.codeBlock}>
            <pre className={styles.code}>
              {JSON.stringify(toolCall.arguments, null, 2)}
            </pre>
          </div>
          {toolCall.result !== undefined && (
            <>
              <div className={styles.codeLabel}>Result</div>
              <div className={styles.codeBlock}>
                <pre className={styles.code}>
                  {JSON.stringify(toolCall.result, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function DebugPanel({ debugInfo }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        className={`${styles.debugToggle} ${isOpen ? styles.debugToggleActive : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Toggle debug panel"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

      {isOpen && (
        <div className={styles.debugPanel}>
          <div className={styles.debugHeader}>
            <span className={styles.debugTitle}>Debug</span>
            <button
              className={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div className={styles.debugContent}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Status</div>
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <div className={styles.statusLabel}>State</div>
                  <div className={styles.statusValue}>
                    <span
                      className={`${styles.badge} ${
                        debugInfo.isStreaming
                          ? styles.badgeStreaming
                          : styles.badgeIdle
                      }`}
                    >
                      {debugInfo.isLoading
                        ? "Loading"
                        : debugInfo.isStreaming
                          ? "Streaming"
                          : "Idle"}
                    </span>
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusLabel}>Messages</div>
                  <div className={styles.statusValue}>
                    {debugInfo.messageCount}
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusLabel}>Conversation</div>
                  <div className={styles.statusValue}>
                    {debugInfo.conversationId
                      ? debugInfo.conversationId.slice(0, 8)
                      : "—"}
                  </div>
                </div>
                <div className={styles.statusItem}>
                  <div className={styles.statusLabel}>Tool Calls</div>
                  <div className={styles.statusValue}>
                    {debugInfo.totalToolCalls}
                  </div>
                </div>
              </div>
            </div>

            {debugInfo.currentToolCall && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Active Tool</div>
                <div className={styles.statusItem}>
                  <div
                    className={`${styles.statusValue} ${styles.statusValueActive}`}
                  >
                    {debugInfo.currentToolCall}
                  </div>
                </div>
              </div>
            )}

            {debugInfo.error && (
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Error</div>
                <div className={styles.statusItem}>
                  <div
                    className={`${styles.statusValue} ${styles.statusValueError}`}
                  >
                    {debugInfo.error}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.section}>
              <div className={styles.sectionTitle}>Tool Calls</div>
              {debugInfo.allToolCalls.length === 0 ? (
                <div className={styles.emptyState}>No tool calls yet</div>
              ) : (
                <div className={styles.toolCallList}>
                  {debugInfo.allToolCalls.map((tc) => (
                    <ToolCallItem key={tc.id} toolCall={tc} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
