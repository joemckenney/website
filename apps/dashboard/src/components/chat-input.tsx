import type { FormEvent, KeyboardEvent } from "react";
import * as styles from "../styles/chat.css";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: ChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.inputArea}>
      <div className={styles.inputWrapper}>
        <form className={styles.inputForm} onSubmit={handleSubmit}>
          <textarea
            className={styles.inputField}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the agent..."
            rows={1}
          />
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!value.trim() || disabled}
          >
            <svg
              className={styles.submitBtnIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </form>
        <div className={styles.inputHint}>
          Press Enter to send - Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
