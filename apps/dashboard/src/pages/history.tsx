import { agentService } from "@agent/sdk";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ensureValidToken } from "../lib/auth";
import * as styles from "../styles/history.css";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConversations() {
      const token = await ensureValidToken();
      if (!token) {
        setError("Not authenticated");
        setIsLoading(false);
        return;
      }

      try {
        const response = await agentService.listConversations({});

        if (response.error || !response.data) {
          setError("Failed to load conversations");
          setIsLoading(false);
          return;
        }

        setConversations(
          response.data.conversations.map((c) => ({
            ...c,
            title: typeof c.title === "string" ? c.title : null,
          })),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversations",
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadConversations();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <header className={styles.header}>
        <span className={styles.title}>History</span>
        <Link to="/new" className={styles.newButton}>
          New conversation
        </Link>
      </header>

      <div className={styles.container}>
        {isLoading && (
          <div className={styles.loading}>Loading conversations...</div>
        )}

        {error && <div className={styles.error}>{error}</div>}

        {!isLoading && !error && conversations.length === 0 && (
          <div className={styles.empty}>
            <p>No conversations yet.</p>
            <Link to="/new" className={styles.emptyLink}>
              Start a new conversation
            </Link>
          </div>
        )}

        {!isLoading && !error && conversations.length > 0 && (
          <ul className={styles.list}>
            {conversations.map((conv) => (
              <li key={conv.id}>
                <Link to={`/chat/${conv.id}`} className={styles.item}>
                  <span className={styles.itemTitle}>
                    {conv.title || "Untitled conversation"}
                  </span>
                  <span className={styles.itemDate}>
                    {formatDate(conv.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
