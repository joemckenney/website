import * as styles from "../styles/chat.css";

export interface MessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
}

interface MessageProps {
  message: MessageData;
}

export function Message({ message }: MessageProps) {
  const time = (message.timestamp || new Date()).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={styles.message}>
      <div className={styles.messageHeader}>
        <span className={styles.messageRole}>
          {message.role === "user" ? "You" : "Agent"}
        </span>
        <span className={styles.messageTime}>{time}</span>
      </div>
      <div
        className={`${styles.messageContent} ${
          message.role === "user"
            ? styles.messageContentUser
            : styles.messageContentAssistant
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div className={styles.thinking}>
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
      <span className={styles.thinkingDot} />
    </div>
  );
}
