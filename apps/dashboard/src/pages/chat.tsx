import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ensureValidToken } from "../lib/auth";
import * as styles from "../styles/chat.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface ModelInfo {
  id: string;
  provider: string;
}

export default function ChatPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<string>("");
  const [input, setInput] = useState("");

  // useChat holds onto the transport from first render. The body fn reads
  // through a ref so model selection changes propagate without rebuilding
  // the transport.
  const modelRef = useRef(model);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/ai/chat`,
        headers: async (): Promise<Record<string, string>> => {
          const token = await ensureValidToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        body: () => ({ model: modelRef.current }),
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({ transport });

  useEffect(() => {
    let cancelled = false;
    async function loadModels() {
      const token = await ensureValidToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/ai/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { models: ModelInfo[] };
      if (cancelled) return;
      setModels(data.models);
      if (data.models[0]) setModel(data.models[0].id);
    }
    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  const isBusy = status === "streaming" || status === "submitted";

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !model || isBusy) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <select
          className={styles.modelSelect}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!models.length}
        >
          {models.length === 0 ? (
            <option>Loading…</option>
          ) : (
            models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id}
              </option>
            ))
          )}
        </select>
      </div>

      <div className={styles.messages}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user" ? styles.messageUser : styles.messageAssistant
            }
          >
            <div className={styles.messageRole}>{m.role}</div>
            <div className={styles.messageBody}>
              {m.parts
                ?.filter(
                  (p): p is { type: "text"; text: string } => p.type === "text",
                )
                .map((p, i) => (
                  <span key={`${m.id}-${i}`}>{p.text}</span>
                ))}
            </div>
          </div>
        ))}
        {error && (
          <div className={styles.error}>
            {error.message || "Something went wrong"}
          </div>
        )}
      </div>

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <textarea
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
          placeholder={model ? `Message ${model}…` : "Loading models…"}
          rows={2}
          disabled={!model || isBusy}
        />
        <button
          type="submit"
          className={styles.sendButton}
          disabled={!input.trim() || !model || isBusy}
        >
          {isBusy ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
