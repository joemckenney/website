import { agentService, type ChatStreamEventData, streamChat } from "@agent/sdk";
import { useCallback, useEffect, useRef, useState } from "react";
import { ensureValidToken } from "../lib/auth";

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: unknown;
  startTime: Date;
  endTime?: Date;
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
  isStreaming?: boolean;
}

interface Column {
  id: string;
  name: string;
  dataType: string;
}

export interface UseTableAgentOptions {
  tableId: string;
  tableName: string;
  columns: Column[];
}

export interface UseTableAgentReturn {
  messages: AgentMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  currentToolCall: string | null;
  conversationId: string | null;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  cancelStream: () => void;
  startNewConversation: () => void;
}

let messageIdCounter = 0;
const generateId = () => `msg-${++messageIdCounter}`;

export function useTableAgent(
  options: UseTableAgentOptions,
): UseTableAgentReturn {
  const { tableId, tableName, columns } = options;

  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: generateId(),
      role: "assistant",
      content: `I can help you work with your "${tableName}" table. Ask me to add columns, insert rows, query data, or make other changes.`,
      timestamp: new Date(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset conversation when table changes
  useEffect(() => {
    setConversationId(null);
    setMessages([
      {
        id: generateId(),
        role: "assistant",
        content: `I can help you work with your "${tableName}" table. Ask me to add columns, insert rows, query data, or make other changes.`,
        timestamp: new Date(),
      },
    ]);
    setError(null);
  }, [tableName]);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setCurrentToolCall(null);
  }, []);

  const startNewConversation = useCallback(() => {
    cancelStream();
    setConversationId(null);
    setMessages([
      {
        id: generateId(),
        role: "assistant",
        content: `I can help you work with your "${tableName}" table. Ask me to add columns, insert rows, query data, or make other changes.`,
        timestamp: new Date(),
      },
    ]);
    setError(null);
    setIsLoading(false);
  }, [cancelStream, tableName]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);

      // Ensure we have a valid token
      const token = await ensureValidToken();
      if (!token) {
        setError("Not authenticated. Please log in.");
        return;
      }

      // Add user message
      const userMessage: AgentMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Create conversation if needed
      let convId = conversationId;
      if (!convId) {
        try {
          const response = await agentService.createConversation({
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: {},
          });
          if (response.error || !response.data) {
            setError("Failed to create conversation");
            return;
          }
          convId = response.data.id;
          setConversationId(convId);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to create conversation",
          );
          return;
        }
      }

      // Create placeholder for assistant message
      const assistantId = generateId();
      const assistantMessage: AgentMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Start streaming
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      // Build column summary for table context
      const columnsList = columns
        .map((c) => `${c.name} (${c.dataType})`)
        .join(", ");

      try {
        for await (const event of streamChat(convId, content.trim(), {
          baseUrl: apiUrl,
          accessToken: token,
          signal: abortControllerRef.current.signal,
          headers: {
            "x-table-id": tableId,
            "x-table-name": tableName,
            "x-table-columns": columnsList,
          },
        })) {
          if (event.event === "delta") {
            const data = event.data as ChatStreamEventData["delta"];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + data.content }
                  : m,
              ),
            );
          } else if (event.event === "tool_call") {
            const data = event.data as ChatStreamEventData["tool_call"];
            setCurrentToolCall(data.name);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: [
                        ...(m.toolCalls || []),
                        { ...data, startTime: new Date() },
                      ],
                    }
                  : m,
              ),
            );
          } else if (event.event === "tool_result") {
            const data = event.data as ChatStreamEventData["tool_result"];
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      toolCalls: m.toolCalls?.map((tc) =>
                        tc.id === data.toolCallId
                          ? { ...tc, result: data.result, endTime: new Date() }
                          : tc,
                      ),
                    }
                  : m,
              ),
            );
            setCurrentToolCall(null);
          } else if (event.event === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m,
              ),
            );
          } else if (event.event === "error") {
            const data = event.data as ChatStreamEventData["error"];
            setError(data.error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content || "An error occurred.",
                      isStreaming: false,
                    }
                  : m,
              ),
            );
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: m.content || "Connection error.",
                    isStreaming: false,
                  }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        setCurrentToolCall(null);
        abortControllerRef.current = null;
      }
    },
    [conversationId, isStreaming, tableId, tableName, columns],
  );

  return {
    messages,
    isStreaming,
    isLoading,
    currentToolCall,
    conversationId,
    error,
    sendMessage,
    cancelStream,
    startNewConversation,
  };
}
