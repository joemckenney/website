import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "../../router";
import { ChatInput } from "../../components/chat-input";
import { DebugPanel } from "../../components/debug-panel";
import {
  Message,
  type MessageData,
  ThinkingIndicator,
} from "../../components/message";
import { useAgent } from "../../hooks/useAgent";
import * as styles from "../../styles/chat.css";

export default function ChatPage() {
  const { id } = useParams("/chat/:id");

  const {
    messages,
    isStreaming,
    isLoading,
    currentToolCall,
    error,
    debugInfo,
    sendMessage,
  } = useAgent({
    conversationId: id,
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

  const handleSubmit = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  // Convert agent messages to MessageData format
  const messageData: MessageData[] = messages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
  }));

  if (isLoading) {
    return (
      <>
        <header className={styles.chatHeader}>
          <span className={styles.chatTitle}>Loading...</span>
        </header>
        <div className={styles.messagesContainer}>
          <ThinkingIndicator />
        </div>
      </>
    );
  }

  return (
    <>
      <header className={styles.chatHeader}>
        <span className={styles.chatTitle}>Conversation</span>
        <span className={styles.chatStatus}>
          <span className={styles.statusDot} />
          {isStreaming
            ? currentToolCall
              ? `Using ${currentToolCall}...`
              : "Responding..."
            : "Connected"}
        </span>
      </header>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.messagesContainer}>
        {messageData.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isStreaming && !messages[messages.length - 1]?.content && (
          <ThinkingIndicator />
        )}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isStreaming}
      />

      <DebugPanel debugInfo={debugInfo} />
    </>
  );
}
