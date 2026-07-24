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
  return `${connection.name ?? "Conexión"} · ${connection.model ?? provider ?? "IA"}`;
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
  const connectionsQuery = useQuery({
    queryKey: ["connections", "skill-builder"],
    queryFn: ({ signal }) => api.get<BuilderConnection[]>("/api/connections", signal),
    retry: false,
  });
  const connections = connectionsQuery.data ?? [];
  const [connectionId, setConnectionId] = useState("");
  const [mode, setMode] = useState<BuilderMode | null>(null);
  const [messages, setMessages] = useState<BuilderMessage[]>([]);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<BuilderDraft | null>(null);
  const [working, setWorking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const selectedConnection = connections.find(
    (connection) => connection.id === connectionId,
  );

  useEffect(() => {
    if (!connectionId && connections.length) {
      setConnectionId(preferredConnection(connections));
    }
  }, [connectionId, connections]);

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
            ? "Cuéntame qué capacidad quieres añadir. Por ejemplo: revisar código Java con buenas prácticas."
            : "Pega las instrucciones completas de la skill. Prepararé el borrador directamente.",
      },
    ]);
    setDraft(null);
    setText("");
    setError("");
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || !mode || !connectionId || working) return;
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
        body: JSON.stringify({ connection_id: connectionId, messages: next, mode }),
        signal: controller.signal,
      })) {
        const payload = item.data;
        if (payload.type === "error") {
          throw new Error(payload.message ?? "No se pudo diseñar la skill");
        }
        if (payload.type !== "builder_done") continue;
        if (payload.assistant_message) {
          setMessages([...next, { role: "assistant", content: payload.assistant_message }]);
        }
        if (payload.status === "ready" && payload.draft) setDraft(payload.draft);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "No se pudo diseñar la skill");
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
              Crear skill con Asistente
            </span>
            <p className="skill-builder-subtitle">
              Diseña la capacidad y revísala en el editor antes de guardarla
            </p>
          </div>
          <button type="button" className="modal-close" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        {connectionsQuery.isLoading ? (
          <div className="skill-builder-empty">Cargando conexiones…</div>
        ) : !connections.length ? (
          <div className="skill-builder-empty">
            <p>Necesitas configurar una conexión de IA para usar el asistente.</p>
            <a className="btn btn-primary" href="/connections/">
              Configurar conexión
            </a>
          </div>
        ) : (
          <>
            <details className="skill-builder-connections">
              <summary>
                <span>Configuración de modelos</span>
                <small>{selectedConnection ? connectionLabel(selectedConnection) : ""} crea</small>
              </summary>
              <div className="skill-builder-toolbar">
                <div className="skill-builder-connection-field">
                  <label htmlFor="skill-builder-connection">Modelo del asistente</label>
                  <select
                    id="skill-builder-connection"
                    className="input"
                    value={connectionId}
                    onChange={(event) => setConnectionId(event.target.value)}
                    disabled={working}
                  >
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connectionLabel(connection)}
                      </option>
                    ))}
                  </select>
                  <span>
                    En NVIDIA NIM se usa automáticamente Llama 3.1 8B para diseñar
                    rápidamente; la skill no queda vinculada a ningún modelo.
                  </span>
                </div>
              </div>
            </details>

            {mode === null ? (
              <section className="skill-builder-mode-picker" aria-label="Forma de creación">
                <div className="skill-builder-mode-heading">
                  <span>Elige cómo quieres empezar</span>
                  <p>En ambos casos podrás revisar y editar el resultado antes de guardarlo.</p>
                </div>
                <div className="skill-builder-mode-options">
                  <button
                    type="button"
                    className="skill-builder-mode-card"
                    onClick={() => chooseMode("guided")}
                  >
                    <span className="skill-builder-mode-icon" aria-hidden="true">◇</span>
                    <strong>Guiarme paso a paso</strong>
                    <small>No necesitas conocimientos técnicos</small>
                    <p>
                      Describe la capacidad con tus palabras y el asistente completará
                      el procedimiento y las comprobaciones.
                    </p>
                    <span className="skill-builder-mode-action">Empezar guiado →</span>
                  </button>
                  <button
                    type="button"
                    className="skill-builder-mode-card"
                    onClick={() => chooseMode("expert")}
                  >
                    <span className="skill-builder-mode-icon" aria-hidden="true">⌘</span>
                    <strong>Ya tengo instrucciones</strong>
                    <small>Para procedimientos o especificaciones completas</small>
                    <p>
                      Pega todos tus requisitos y generaremos el borrador directamente.
                    </p>
                    <span className="skill-builder-mode-action">Pegar instrucciones →</span>
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
                    Cambiar modo
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
                        Diseñando la skill… {elapsed}s
                      </span>
                    </div>
                  )}
                  {mode === "guided" && messages.length === 1 && !working && (
                    <div className="skill-builder-examples" aria-label="Ejemplos">
                      {[
                        "Revisar código Java",
                        "Crear pruebas para APIs",
                        "Analizar documentos",
                        "Redactar contenido SEO",
                      ].map((example) => (
                        <button
                          type="button"
                          key={example}
                          onClick={() => setText(`Quiero una skill para ${example.toLowerCase()}`)}
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
                        ? "Pega aquí objetivos, proceso, reglas y formato de salida…"
                        : "Ej.: una skill para revisar código Java con buenas prácticas…"
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
                    disabled={!text.trim() || working || !connectionId}
                  >
                    {working ? "Esperando…" : "Enviar"}
                  </button>
                </form>
              </section>

              {draft && (
                <section className="skill-builder-preview">
                  <div className="skill-builder-preview-header">
                    <span className="skill-builder-ready">Borrador listo</span>
                    <h3>Revisa los detalles</h3>
                  </div>
                  <label>
                    Nombre
                    <input
                      className="input"
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    />
                  </label>
                  <label>
                    Descripción
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
                    Categoría
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
                    Instrucciones
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
                      Continuar en el editor
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
