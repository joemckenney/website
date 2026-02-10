import { useCallback, useEffect, useRef, useState } from "react";
import { type AgentMessage, useTableAgent } from "../../hooks/useTableAgent";
import * as styles from "../../styles/tables.css";

interface Column {
  id: string;
  name: string;
  dataType: string;
}

interface ChatPanelProps {
  tableId: string;
  tableName: string;
  columns: Column[];
  onClose?: () => void;
}

export function ChatPanel({
  tableId,
  tableName,
  columns,
  onClose,
}: ChatPanelProps) {
  const {
    messages,
    isStreaming,
    isLoading,
    currentToolCall,
    error,
    sendMessage,
  } = useTableAgent({
    tableId,
    tableName,
    columns,
  });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatPanelHeader}>
        <span className={styles.chatPanelTitle}>AI Assistant</span>
        <div className={styles.chatPanelHeaderRight}>
          <span className={styles.chatPanelStatus}>
            <span
              className={styles.chatPanelStatusDot}
              data-status={isStreaming ? "active" : "idle"}
            />
            {isStreaming
              ? currentToolCall
                ? `Using ${currentToolCall}...`
                : "Thinking..."
              : "Ready"}
          </span>
          {onClose && (
            <button
              type="button"
              className={styles.chatPanelCloseBtn}
              onClick={onClose}
              aria-label="Close chat panel"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.chatPanelError}>{error}</div>}

      <div className={styles.chatPanelMessages}>
        {isLoading ? (
          <div className={styles.chatPanelLoading}>Loading...</div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {isStreaming && !messages[messages.length - 1]?.content && (
          <ThinkingIndicator />
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.chatPanelInputArea} onSubmit={handleSubmit}>
        <textarea
          className={styles.chatPanelInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your table..."
          rows={1}
          disabled={isStreaming}
        />
        <button
          type="submit"
          className={styles.chatPanelSendBtn}
          disabled={!input.trim() || isStreaming}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: AgentMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={
        isUser ? styles.chatPanelMessageUser : styles.chatPanelMessageAssistant
      }
    >
      <div className={styles.chatPanelMessageRole}>
        {isUser ? "You" : "Assistant"}
      </div>
      <div className={styles.chatPanelMessageContent}>
        {message.content}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className={styles.chatPanelToolCalls}>
            {message.toolCalls.map((tc) => (
              <div key={tc.id} className={styles.chatPanelToolCall}>
                <span className={styles.chatPanelToolCallName}>{tc.name}</span>
                {tc.endTime && (
                  <span className={styles.chatPanelToolCallStatus}>Done</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className={styles.chatPanelThinking}>
      <span className={styles.chatPanelThinkingDot} />
      <span className={styles.chatPanelThinkingDot} />
      <span className={styles.chatPanelThinkingDot} />
    </div>
  );
}
