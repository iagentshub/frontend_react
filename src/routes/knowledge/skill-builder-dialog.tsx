import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, streamEvents } from "@/api/client";
import type { SkillDraft } from "./types";

interface BuilderConnection {
  id: string;
  name?: string;
  type?: string;
  model?: string;
}

interface BuilderMessage {
  role: "user" | "assistant";
  content: string;
}

interface BuilderDraft {
  name: string;
  description: string;
  category: string;
  icon: string;
  content: string;
}

interface BuilderEvent {
  type?: "progress" | "builder_done" | "error";
  assistant_message?: string;
  status?: "collecting" | "ready";
  draft?: BuilderDraft | null;
  message?: string;
}

type BuilderMode = "guided" | "expert";

const categories = [
  "ai",
  "messaging",
  "notes",
  "productivity",
  "dev",
  "security",
  "media",
  "data",
  "company",
];

function connectionLabel(connection: BuilderConnection) {
  const provider = connection.type === "nvidia" ? "NVIDIA NIM" : connection.type;
  return `${connection.name ?? i18n.t("common.resource_type.connection")} · ${
    connection.model ?? provider ?? "IA"
  }`;
}

function preferredConnection(connections: BuilderConnection[]) {
  return (
    connections.find((connection) =>
      /\b(1b|3b|7b|8b|mini|flash|small|haiku)\b/i.test(
        `${connection.name ?? ""} ${connection.model ?? ""}`,
      ),
    )?.id ??
    connections[0]?.id ??
    ""
  );
}

export function SkillBuilderDialog({
  onClose,
  onReady,
}: {
  onClose: () => void;
  onReady: (draft: SkillDraft) => void;
}) {
  const { t } = useTranslation();
  const connectionsQuery = useQuery({
    queryKey: ["connections", "skill-builder"],
    queryFn: ({ signal }) => api.get<BuilderConnection[]>("/api/connections", signal),
    retry: false,
  });
  const connections = connectionsQuery.data ?? [];
  const [connectionId, setConnectionId] = useState("");
  const effectiveConnectionId = connectionId || preferredConnection(connections);
  const [mode, setMode] = useState<BuilderMode | null>(null);
  const [messages, setMessages] = useState<BuilderMessage[]>([]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<BuilderDraft | null>(null);
  const [working, setWorking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const selectedConnection = connections.find(
    (connection) => connection.id === effectiveConnectionId,
  );

  useEffect(() => {
    if (!working) return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1_000)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [working]);

  const chooseMode = (nextMode: BuilderMode) => {
    setMode(nextMode);
    setMessages([
      {
        role: "assistant",
        content:
          nextMode === "guided"
            ? i18n.t("dynamic.text_a072c511d8b2")
            : i18n.t("dynamic.text_9886005a5350"),
      },
    ]);
    setDraft(null);
    setText("");
    setError("");
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !mode || !effectiveConnectionId || working) return;
    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setText("");
    setDraft(null);
    setError("");
    setElapsed(0);
    setWorking(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      for await (const item of streamEvents<BuilderEvent>("/api/skill-builder/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connection_id: effectiveConnectionId, messages: next, mode }),
        signal: controller.signal,
      })) {
        const payload = item.data;
        if (payload.type === "error") {
          throw new Error(payload.message ?? i18n.t("dynamic.text_06476bebc849"));
        }
        if (payload.type !== "builder_done") continue;
        if (payload.assistant_message) {
          setMessages([...next, { role: "assistant", content: payload.assistant_message }]);
        }
        if (payload.status === "ready" && payload.draft) setDraft(payload.draft);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : i18n.t("dynamic.text_06476bebc849"));
      }
    } finally {
      setWorking(false);
      abortRef.current = null;
    }
  };

  const close = () => {
    abortRef.current?.abort();
    onClose();
  };

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-labelledby="skill-builder-title">
      <div className="modal-box skill-builder">
        <div className="modal-header">
          <div>
            <span className="modal-title" id="skill-builder-title">
              {t("legacy.text_fc67ff3265d9")}
            </span>

            <p className="skill-builder-subtitle">{t("legacy.text_373f74443d5f")}</p>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={close}
            aria-label={t("agents.chat.close")}
          >
            ×
          </button>
        </div>

        {connectionsQuery.isLoading ? (
          <div className="skill-builder-empty">{t("legacy.text_cbf986c6f653")}</div>
        ) : !connections.length ? (
          <div className="skill-builder-empty">
            <p>{t("legacy.text_b59396fbd04d")}</p>

            <a className="btn btn-primary" href="/connections/">
              {t("legacy.text_d90380433b02")}
            </a>
          </div>
        ) : (
          <>
            <details className="skill-builder-connections">
              <summary>
                <span>{t("legacy.text_3c4ee739fc8a")}</span>

                <small>
                  {selectedConnection ? connectionLabel(selectedConnection) : ""}{" "}
                  {t("legacy.text_2c33bd540bd7")}
                </small>
              </summary>

              <div className="skill-builder-toolbar">
                <div className="skill-builder-connection-field">
                  <label htmlFor="skill-builder-connection">{t("legacy.text_d99c313c4f66")}</label>

                  <select
                    id="skill-builder-connection"
                    className="input"
                    value={effectiveConnectionId}
                    onChange={(event) => setConnectionId(event.target.value)}
                    disabled={working}
                  >
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connectionLabel(connection)}
                      </option>
                    ))}
                  </select>

                  <span>{t("legacy.text_e39055439a5c")}</span>
                </div>
              </div>
            </details>

            {mode === null ? (
              <section
                className="skill-builder-mode-picker"
                aria-label={t("legacy.text_b4e7ccb00be0")}
              >
                <div className="skill-builder-mode-heading">
                  <span>{t("legacy.text_63ef9928fa12")}</span>

                  <p>{t("legacy.text_1c9080c4acb6")}</p>
                </div>

                <div className="skill-builder-mode-options">
                  <button
                    type="button"
                    className="skill-builder-mode-card"
                    onClick={() => chooseMode("guided")}
                  >
                    <span className="skill-builder-mode-icon" aria-hidden="true">
                      ◇
                    </span>

                    <strong>{t("legacy.text_8843efac3a00")}</strong>

                    <small>{t("legacy.text_859d0182b1c4")}</small>

                    <p>{t("legacy.text_25a7cb68fa9f")}</p>

                    <span className="skill-builder-mode-action">
                      {t("legacy.text_6347709866fd")}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="skill-builder-mode-card"
                    onClick={() => chooseMode("expert")}
                  >
                    <span className="skill-builder-mode-icon" aria-hidden="true">
                      ⌘
                    </span>

                    <strong>{t("legacy.text_115929d2d2d0")}</strong>

                    <small>{t("legacy.text_043018691967")}</small>

                    <p>{t("legacy.text_a02bc2293aec")}</p>

                    <span className="skill-builder-mode-action">
                      {t("legacy.text_f0f67c8b384f")}
                    </span>
                  </button>
                </div>
              </section>
            ) : (
              <>
                <div className="skill-builder-mode-bar">
                  <span>
                    {mode === "guided" ? "Guiado paso a paso" : "Instrucciones completas"}
                  </span>

                  <button
                    type="button"
                    disabled={working}
                    onClick={() => {
                      abortRef.current?.abort();
                      setMode(null);
                      setMessages([]);
                      setDraft(null);
                      setWorking(false);
                    }}
                  >
                    {t("legacy.text_c4c6f301b364")}
                  </button>
                </div>

                <div className={`skill-builder-body${draft ? " has-draft" : ""}`}>
                  <section className="skill-builder-chat">
                    <div className="skill-builder-messages">
                      {messages.map((message, index) => (
                        <div
                          className={`skill-builder-message skill-builder-message--${message.role}`}
                          key={`${message.role}-${index}`}
                        >
                          {message.content}
                        </div>
                      ))}

                      {working && (
                        <div className="skill-builder-message skill-builder-message--assistant">
                          <span className="skill-builder-thinking">
                            {t("legacy.text_d4d57e72f034")}
                            {elapsed}
                            {t("legacy.text_a0f1490a20d0")}
                          </span>
                        </div>
                      )}

                      {mode === "guided" && messages.length === 1 && !working && (
                        <div
                          className="skill-builder-examples"
                          aria-label={t("legacy.text_7b1787ff203e")}
                        >
                          {[
                            i18n.t("dynamic.text_8fede4ae3d7b"),
                            "Crear pruebas para APIs",
                            "Analizar documentos",
                            "Redactar contenido SEO",
                          ].map((example) => (
                            <button
                              type="button"
                              key={example}
                              onClick={() =>
                                setText(`Quiero una skill para ${example.toLowerCase()}`)
                              }
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <form className="skill-builder-input" onSubmit={(event) => void send(event)}>
                      <textarea
                        className="input"
                        rows={mode === "expert" ? 7 : 3}
                        value={text}
                        onChange={(event) => setText(event.target.value)}
                        placeholder={
                          mode === "expert"
                            ? i18n.t("dynamic.text_9fa44a2a5453")
                            : i18n.t("dynamic.text_240054f628cd")
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
                        disabled={!text.trim() || working || !effectiveConnectionId}
                      >
                        {working ? "Esperando…" : "Enviar"}
                      </button>
                    </form>
                  </section>

                  {draft && (
                    <section className="skill-builder-preview">
                      <div className="skill-builder-preview-header">
                        <span className="skill-builder-ready">{t("legacy.text_0137207e8dec")}</span>

                        <h3>{t("legacy.text_1f454d04e835")}</h3>
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
                        {t("errors.fields.category")}
                        <select
                          className="input"
                          value={draft.category}
                          onChange={(event) =>
                            setDraft({
                              ...draft,
                              category: event.target.value,
                              icon: event.target.value,
                            })
                          }
                        >
                          {categories.map((category) => (
                            <option value={category} key={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        {t("legacy.text_b838b37e8b1c")}
                        <textarea
                          className="input skill-builder-content skill-builder-prompt"
                          rows={14}
                          value={draft.content}
                          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
                        />
                      </label>

                      <div className="skill-builder-preview-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={!draft.name.trim() || !draft.content.trim()}
                          onClick={() =>
                            onReady({
                              ...draft,
                              labels: ["private"],
                            })
                          }
                        >
                          {t("legacy.text_1837530debe5")}
                        </button>
                      </div>
                    </section>
                  )}
                </div>

                {error && <div className="skill-builder-error">{error}</div>}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
