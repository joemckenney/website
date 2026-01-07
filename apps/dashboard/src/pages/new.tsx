import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "../components/chat-input";
import {
  Message,
  type MessageData,
  ThinkingIndicator,
} from "../components/message";
import * as styles from "../styles/chat.css";

let messageIdCounter = 0;
const generateId = () => `msg-${++messageIdCounter}`;

export default function NewConversationPage() {
  const [messages, setMessages] = useState<MessageData[]>([
    {
      id: generateId(),
      role: "assistant",
      content: "Ready.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = () => {
    if (!input.trim()) return;

    const userMessage: MessageData = {
      id: generateId(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    // Simulate agent response
    setTimeout(() => {
      setIsThinking(false);
      const assistantMessage: MessageData = {
        id: generateId(),
        role: "assistant",
        content:
          "This is a simulated response. Connect your agent backend to handle real interactions.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1500);
  };

  return (
    <>
      <header className={styles.chatHeader}>
        <span className={styles.chatTitle}>Conversation</span>
        <span className={styles.chatStatus}>
          <span className={styles.statusDot} />
          Connected
        </span>
      </header>

      <div className={styles.messagesContainer}>
        {messages.map((msg) => (
          <Message key={msg.id} message={msg} />
        ))}

        {isThinking && <ThinkingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isThinking}
      />
    </>
  );
}
