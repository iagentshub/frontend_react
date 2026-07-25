import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { api, streamEvents } from "@/api/client";

interface BuilderConnection {
  id: string;
  name?: string;
  type?: string;
  model?: string;
}

interface BuilderResource {
  id: string;
  name?: string;
  title?: string;
}

interface BuilderMessage {
  role: "user" | "assistant";
  content: string;
}

type BuilderMode = "guided" | "expert";

interface AgentDraft {
  name: string;
  description: string;
  system_prompt: string;
  model?: string;
  temperature: number;
  skills: string[];
  knowledge: string[];
  use_memory: boolean;
}

interface BuilderEvent {
  type?: "progress" | "builder_done" | "error";
  assistant_message?: string;
  status?: "collecting" | "ready";
  draft?: AgentDraft | null;
  message?: string;
}

const providerNames: Record<string, string> = {
  nvidia: "NVIDIA NIM",
  openai: "OpenAI",
  anthropic: "Anthropic",
  claude: "Anthropic",
  google: "Google",
  gemini: "Google",
  ollama: "Ollama",
  grok: "Grok",
  qwen: "Qwen",
};

function preferredBuilderConnection(connections: BuilderConnection[]): string {
  const fastModel = connections.find((connection) =>
    /\b(1b|3b|7b|8b|mini|flash|small|haiku)\b/i.test(
      `${connection.name ?? ""} ${connection.model ?? ""}`,
    ),
  );
  return fastModel?.id ?? connections[0]?.id ?? "";
}

function connectionLabel(connection?: BuilderConnection): string {
  if (!connection) return i18n.t("agents.modal.no_connection");
  return `${connection.name ?? i18n.t("common.resource_type.connection")} · ${
    connection.model ?? providerNames[connection.type ?? ""] ?? connection.type ?? "IA"
  }`;
}

export function AgentBuilderDialog({
  connections,
  skills,
  knowledge,
  onClose,
  onSaved,
}: {
  connections: BuilderConnection[];
  skills: BuilderResource[];
  knowledge: BuilderResource[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [builderConnectionId, setBuilderConnectionId] = useState(
    preferredBuilderConnection(connections),
  );
  const [agentConnectionId, setAgentConnectionId] = useState(connections[0]?.id ?? "");
  const [mode, setMode] = useState<BuilderMode | null>(null);
  const [messages, setMessages] = useState<BuilderMessage[]>([]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [working, setWorking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!working) return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [working]);
  const resourcePayload = useMemo(
    () => ({
      skills: skills
        .filter((item) => item.name)
        .map((item) => ({ id: item.id, name: item.name ?? item.id })),
      knowledge: knowledge
        .filter((item) => item.title || item.name)
        .map((item) => ({ id: item.id, name: item.title ?? item.name ?? item.id })),
    }),
    [knowledge, skills],
  );
  const selectedBuilderConnection = connections.find(
    (connection) => connection.id === builderConnectionId,
  );
  const selectedAgentConnection = connections.find(
    (connection) => connection.id === agentConnectionId,
  );

  const chooseMode = (nextMode: BuilderMode) => {
    setMode(nextMode);
    setMessages([
      {
        role: "assistant",
        content:
          nextMode === "guided"
            ? i18n.t("dynamic.text_f58396675938")
            : i18n.t("dynamic.text_cc5a50b3275f"),
      },
    ]);
    setText("");
    setDraft(null);
    setError(null);
  };

  const resetMode = () => {
    abortRef.current?.abort();
    setMode(null);
    setMessages([]);
    setText("");
    setDraft(null);
    setError(null);
    setWorking(false);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !builderConnectionId || !mode || working) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setText("");
    setDraft(null);
    setError(null);
    setElapsed(0);
    setWorking(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const eventItem of streamEvents<BuilderEvent>("/api/agent-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connection_id: builderConnectionId,
          messages: next,
          resources: resourcePayload,
          mode,
        }),
        signal: controller.signal,
      })) {
        const payload = eventItem.data;
        if (payload.type === "error")
          throw new Error(payload.message ?? i18n.t("common.errors.agent_builder"));
        if (payload.type !== "builder_done") continue;
        if (payload.assistant_message) {
          setMessages([...next, { role: "assistant", content: payload.assistant_message }]);
        }
        if (payload.status === "ready" && payload.draft) setDraft(payload.draft);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : i18n.t("common.errors.generate_agent"));
      }
    } finally {
      setWorking(false);
      abortRef.current = null;
    }
  };

  const save = async () => {
    if (!draft || !agentConnectionId || saving) return;
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/agents", {
        ...draft,
        connection_id: agentConnectionId,
        agent_type: "generic",
        scope: "private",
        labels: ["private"],
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("common.errors.save_agent"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="builder-title">
      <div className="modal-box agent-builder">
        <div className="modal-header">
          <div>
            <span className="modal-title" id="builder-title">
              {t("legacy.text_52d884f096f6")}
            </span>

            <p className="agent-builder-subtitle">{t("legacy.text_acda56908346")}</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label={t("agents.chat.close")}
          >
            ×
          </button>
        </div>

        {!connections.length ? (
          <div className="modal-body agent-builder-empty">
            <p>{t("legacy.text_950f503197b8")}</p>

            <a className="btn btn-primary" href="/connections/">
              {t("legacy.text_d90380433b02")}
            </a>
          </div>
        ) : (
          <>
            <details className="agent-builder-connections">
              <summary>
                <span>{t("legacy.text_3c4ee739fc8a")}</span>

                <small>
                  {connectionLabel(selectedBuilderConnection)} {t("legacy.text_1ec88a291db8")}{" "}
                  {connectionLabel(selectedAgentConnection)} {t("legacy.text_3693968d863b")}
                </small>
              </summary>

              <div className="agent-builder-toolbar">
                <div className="agent-builder-connection-field">
                  <label htmlFor="builder-connection">{t("legacy.text_d99c313c4f66")}</label>

                  <select
                    id="builder-connection"
                    className="input"
                    value={builderConnectionId}
                    onChange={(event) => setBuilderConnectionId(event.target.value)}
                    disabled={working}
                  >
                    {connections.map((connection) => (
                      <option value={connection.id} key={connection.id}>
                        {connectionLabel(connection)}
                      </option>
                    ))}
                  </select>

                  <span>{t("legacy.text_693f07cc33ea")}</span>
                </div>

                <div className="agent-builder-connection-field">
                  <label htmlFor="agent-connection">{t("legacy.text_ebd6846e90c9")}</label>

                  <select
                    id="agent-connection"
                    className="input"
                    value={agentConnectionId}
                    onChange={(event) => setAgentConnectionId(event.target.value)}
                  >
                    {connections.map((connection) => (
                      <option value={connection.id} key={connection.id}>
                        {connectionLabel(connection)}
                      </option>
                    ))}
                  </select>

                  <span>{t("legacy.text_df999b5643a3")}</span>
                </div>
              </div>
            </details>

            {mode === null ? (
              <section
                className="agent-builder-mode-picker"
                aria-label={t("legacy.text_b4e7ccb00be0")}
              >
                <div className="agent-builder-mode-heading">
                  <span>{t("legacy.text_63ef9928fa12")}</span>

                  <p>{t("legacy.text_1c9080c4acb6")}</p>
                </div>

                <div className="agent-builder-mode-options">
                  <button
                    type="button"
                    className="agent-builder-mode-card"
                    onClick={() => chooseMode("guided")}
                  >
                    <span className="agent-builder-mode-icon" aria-hidden="true">
                      ◇
                    </span>

                    <strong>{t("legacy.text_8843efac3a00")}</strong>

                    <small>{t("legacy.text_859d0182b1c4")}</small>

                    <p>{t("legacy.text_3733f6407810")}</p>

                    <span className="agent-builder-mode-action">
                      {t("legacy.text_6347709866fd")}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="agent-builder-mode-card"
                    onClick={() => chooseMode("expert")}
                  >
                    <span className="agent-builder-mode-icon" aria-hidden="true">
                      ⌘
                    </span>

                    <strong>{t("legacy.text_115929d2d2d0")}</strong>

                    <small>{t("legacy.text_c102f4be455f")}</small>

                    <p>{t("legacy.text_a02bc2293aec")}</p>

                    <span className="agent-builder-mode-action">
                      {t("legacy.text_f0f67c8b384f")}
                    </span>
                  </button>
                </div>
              </section>
            ) : (
              <>
                <div className="agent-builder-mode-bar">
                  <span>
                    {mode === "guided" ? "Guiado paso a paso" : "Instrucciones completas"}
                  </span>

                  <button type="button" onClick={resetMode} disabled={working}>
                    {t("legacy.text_c4c6f301b364")}
                  </button>
                </div>

                <div className={`agent-builder-body${draft ? " has-draft" : ""}`}>
                  <section
                    className="agent-builder-chat"
                    aria-label={t("errors.resources.conversation")}
                  >
                    <div className="agent-builder-messages">
                      {messages.map((message, index) => (
                        <div
                          className={`agent-builder-message agent-builder-message--${message.role}`}
                          key={`${message.role}-${index}`}
                        >
                          {message.content}
                        </div>
                      ))}

                      {working && (
                        <div className="agent-builder-message agent-builder-message--assistant">
                          <span className="agent-builder-thinking">
                            {elapsed < 60
                              ? i18n.t("dynamic.agent_builder_designing", {
                                  seconds: elapsed,
                                })
                              : `NVIDIA sigue procesando… ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
                          </span>
                        </div>
                      )}

                      {mode === "guided" && messages.length === 1 && !working && (
                        <div
                          className="agent-builder-examples"
                          aria-label={t("legacy.text_7b1787ff203e")}
                        >
                          {[
                            "Responder dudas de clientes",
                            "Crear contenido para redes",
                            "Analizar documentos",
                            i18n.t("dynamic.text_47a2b6d6d24d"),
                          ].map((example) => (
                            <button
                              type="button"
                              key={example}
                              onClick={() =>
                                setText(`Quiero un agente para ${example.toLowerCase()}`)
                              }
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <form className="agent-builder-input" onSubmit={(event) => void send(event)}>
                      <textarea
                        className="input"
                        rows={mode === "expert" ? 6 : 3}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={
                          mode === "expert"
                            ? i18n.t("dynamic.text_67ebb88dcc61")
                            : "Ej.: quiero que ayude a mis clientes a elegir el producto adecuado…"
                        }
                        disabled={working}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                      />

                      <button
                        className="btn btn-primary"
                        disabled={!text.trim() || !builderConnectionId || !mode || working}
                      >
                        {working ? "Esperando…" : "Enviar"}
                      </button>
                    </form>
                  </section>

                  {draft && (
                    <section
                      className="agent-builder-preview"
                      aria-label={t("legacy.text_f9f2dc5839fc")}
                    >
                      <div className="agent-builder-preview-header">
                        <div>
                          <span className="agent-builder-ready">
                            {t("legacy.text_0137207e8dec")}
                          </span>

                          <h3>{t("legacy.text_1f454d04e835")}</h3>
                        </div>
                      </div>

                      <label>
                        {t("agents.modal.field_name")}
                        <input
                          className="input"
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                        />
                      </label>

                      <label>
                        {t("agents.modal.field_description")}
                        <textarea
                          className="input"
                          rows={3}
                          value={draft.description}
                          onChange={(event) =>
                            setDraft({ ...draft, description: event.target.value })
                          }
                        />
                      </label>

                      <label>
                        {t("legacy.text_b838b37e8b1c")}
                        <textarea
                          className="input agent-builder-prompt"
                          rows={12}
                          value={draft.system_prompt}
                          onChange={(event) =>
                            setDraft({ ...draft, system_prompt: event.target.value })
                          }
                        />
                      </label>

                      <div className="agent-builder-preview-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void save()}
                          disabled={saving || !draft.name.trim() || !draft.system_prompt.trim()}
                        >
                          {t(
                            saving
                              ? "agents.builder_actions.saving"
                              : "agents.builder_actions.create_agent",
                          )}
                        </button>
                      </div>
                    </section>
                  )}
                </div>

                {error && <div className="agent-builder-error">{error}</div>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
