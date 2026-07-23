/* eslint-disable react-hooks/set-state-in-effect -- chat state mirrors server-selected conversations and history. */
/* eslint-disable react-hooks/exhaustive-deps -- query result methods are stable; dependencies use their data snapshots. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { AgentGlyph } from "@/components/resource-icons";
import "../../../assets/components/dialog_chat/dialog_chat.css";
interface ChatAgent {
  id: string;
  name?: string;
  icon?: string;
  timeout?: number | null;
}
interface Conversation {
  id: string;
  title?: string;
}
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  tokens?: { in?: number; out?: number };
}
export function ChatDialog({ agent, onClose }: { agent: ChatAgent; onClose: () => void }) {
  const list = useQuery({
      queryKey: ["chats", agent.id],
      queryFn: ({ signal }) =>
        api.get<Conversation[]>(`/api/chats/${encodeURIComponent(agent.id)}`, signal),
    }),
    [conversation, setConversation] = useState<string | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [streaming, setStreaming] = useState(false),
    [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null),
    messagesEnd = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (list.data && !conversation) {
      const first = list.data[0];
      if (first) setConversation(first.id);
      else
        void api
          .post<Conversation>(`/api/chats/${encodeURIComponent(agent.id)}`, { title: "" })
          .then((created) => {
            setConversation(created.id);
            void list.refetch();
          });
    }
  }, [list.data, conversation, agent.id]);
  const history = useQuery({
    queryKey: ["chats", agent.id, conversation],
    enabled: Boolean(conversation),
    queryFn: ({ signal }) =>
      api.get<Message[]>(
        `/api/chats/${encodeURIComponent(agent.id)}/${encodeURIComponent(conversation ?? "")}`,
        signal,
      ),
  });
  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data]);
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ block: "end" });
  }, [messages, streaming]);
  const create = useMutation({
    mutationFn: () =>
      api.post<Conversation>(`/api/chats/${encodeURIComponent(agent.id)}`, { title: "" }),
    onSuccess: (item) => {
      setConversation(item.id);
      setMessages([]);
      void list.refetch();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/chats/${encodeURIComponent(agent.id)}/${encodeURIComponent(id)}`),
    onSuccess: () => {
      setConversation(null);
      void list.refetch();
    },
  });
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || streaming) return;
    setText("");
    setError(null);
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setStreaming(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agent.id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          messages: next
            .filter((message) => message.role !== "system")
            .map(({ role, content }) => ({ role, content })),
          ...(conversation ? { conversation_id: conversation } : {}),
        }),
        signal: controller.signal,
      });
      if (!response.ok) throw new ApiError(response.status);
      if (!response.body) throw new Error("Respuesta sin stream");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "",
        reply = "",
        tokens: Message["tokens"];
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6)) as {
            type?: string;
            token?: string;
            reply?: string;
            message?: string;
            tokens?: Message["tokens"];
          };
          if (payload.type === "token") reply += payload.token ?? "";
          if (payload.type === "done") {
            reply = payload.reply ?? reply;
            tokens = payload.tokens;
          }
          if (payload.type === "error") throw new Error(payload.message ?? "Error del agente");
          setMessages([
            ...next,
            { role: "assistant", content: reply, ...(tokens ? { tokens } : {}) },
          ]);
        }
      }
      if (!reply) setMessages(next);
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "Error de chat");
    } finally {
      setStreaming(false);
      abort.current = null;
      void list.refetch();
    }
  };
  return (
    <div className="chat-modal-bg" role="dialog" aria-modal="true">
      <div className="chat-box chat-box--with-history">
        <div className="chat-header">
          <div className="chat-header-avatar">
            <AgentGlyph icon={agent.icon} size={20} />
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">{agent.name || "Agente"}</div>
            <div className="chat-header-sub">Chat</div>
          </div>
          <div className="chat-header-actions">
            <button className="modal-close" onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </div>
        <div className="chat-body">
          <aside className="chat-history-sidebar">
            <button className="history-new-btn" onClick={() => create.mutate()}>
              ＋ Nueva conversación
            </button>
            <ul className="chat-history-list">
              {list.data?.map((item) => (
                <li
                  className={`chat-history-item${conversation === item.id ? " active" : ""}`}
                  key={item.id}
                  onClick={() => setConversation(item.id)}
                >
                  <span className="history-item-title">{item.title || "Nueva conversación"}</span>
                  <button
                    className="history-del-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove.mutate(item.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div className={`msg-wrap ${message.role}`} key={index}>
                <div className="msg-avatar">
                  {message.role === "assistant" ? <AgentGlyph icon={agent.icon} size={17} /> : "Tú"}
                </div>
                <div className="msg-body">
                  <div className="msg-bubble" style={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </div>
                  {message.tokens && (
                    <div className="msg-tok">
                      ↑ {message.tokens.in ?? 0} ↓ {message.tokens.out ?? 0} tok
                    </div>
                  )}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="msg-wrap assistant">
                <div className="msg-avatar">
                  <AgentGlyph icon={agent.icon} size={17} />
                </div>
                <div className="msg-bubble">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
        <form className="chat-input-bar" onSubmit={(event) => void send(event)}>
          <textarea
            className="chat-input"
            placeholder="Escribe un mensaje…"
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button className="chat-send-btn" disabled={!text.trim() || streaming}>
            {streaming ? "…" : "➤"}
          </button>
          {streaming && (
            <button type="button" className="chat-send-btn" onClick={() => abort.current?.abort()}>
              ■
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
