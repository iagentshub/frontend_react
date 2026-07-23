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
  if (!connection) return "Sin conexión";
  return `${connection.name ?? "Conexión"} · ${
    connection.model ??
    providerNames[connection.type ?? ""] ??
    connection.type ??
    "IA"
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
            ? "Cuéntame con tus palabras qué te gustaría que hiciera el agente. No necesitas usar términos técnicos."
            : "Pega tus instrucciones o especificación. Crearé el borrador directamente, sin preguntas innecesarias.",
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
        if (payload.type === "error") throw new Error(payload.message ?? "Error del constructor");
        if (payload.type !== "builder_done") continue;
        if (payload.assistant_message) {
          setMessages([
            ...next,
            { role: "assistant", content: payload.assistant_message },
          ]);
        }
        if (payload.status === "ready" && payload.draft) setDraft(payload.draft);
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "No se pudo generar el agente");
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
      setError(cause instanceof Error ? cause.message : "No se pudo guardar el agente");
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
              Crear con Asistente
            </span>
            <p className="agent-builder-subtitle">Diseña y revisa el agente antes de guardarlo</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              abortRef.current?.abort();
              onClose();
            }}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {!connections.length ? (
          <div className="modal-body agent-builder-empty">
            <p>Necesitas configurar una conexión de IA antes de usar el constructor.</p>
            <a className="btn btn-primary" href="/connections/">
              Configurar conexión
            </a>
          </div>
        ) : (
          <>
            <details className="agent-builder-connections">
              <summary>
                <span>Configuración de modelos</span>
                <small>
                  {connectionLabel(selectedBuilderConnection)} crea ·{" "}
                  {connectionLabel(selectedAgentConnection)} ejecuta
                </small>
              </summary>
              <div className="agent-builder-toolbar">
                <div className="agent-builder-connection-field">
                  <label htmlFor="builder-connection">Modelo del asistente</label>
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
                  <span>Conviene usar un modelo rápido como Llama 3B u 8B.</span>
                </div>
                <div className="agent-builder-connection-field">
                  <label htmlFor="agent-connection">Modelo del agente final</label>
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
                  <span>Será el modelo que utilizará el agente cuando chatees con él.</span>
                </div>
              </div>
            </details>

            {mode === null ? (
              <section className="agent-builder-mode-picker" aria-label="Forma de creación">
                <div className="agent-builder-mode-heading">
                  <span>Elige cómo quieres empezar</span>
                  <p>En ambos casos podrás revisar y editar el resultado antes de guardarlo.</p>
                </div>
                <div className="agent-builder-mode-options">
                  <button
                    type="button"
                    className="agent-builder-mode-card"
                    onClick={() => chooseMode("guided")}
                  >
                    <span className="agent-builder-mode-icon" aria-hidden="true">◇</span>
                    <strong>Guiarme paso a paso</strong>
                    <small>No necesitas conocimientos técnicos</small>
                    <p>Cuéntanos tu idea y el asistente te hará como máximo dos preguntas sencillas.</p>
                    <span className="agent-builder-mode-action">Empezar guiado →</span>
                  </button>
                  <button
                    type="button"
                    className="agent-builder-mode-card"
                    onClick={() => chooseMode("expert")}
                  >
                    <span className="agent-builder-mode-icon" aria-hidden="true">⌘</span>
                    <strong>Ya tengo instrucciones</strong>
                    <small>Para prompts o especificaciones completas</small>
                    <p>Pega todos tus requisitos y generaremos el borrador directamente.</p>
                    <span className="agent-builder-mode-action">Pegar instrucciones →</span>
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
                    Cambiar modo
                  </button>
                </div>
                <div className={`agent-builder-body${draft ? " has-draft" : ""}`}>
              <section className="agent-builder-chat" aria-label="Conversación">
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
                          ? `Diseñando el agente… ${elapsed}s`
                          : `NVIDIA sigue procesando… ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`}
                      </span>
                    </div>
                  )}
                  {mode === "guided" && messages.length === 1 && !working && (
                    <div className="agent-builder-examples" aria-label="Ejemplos">
                      {[
                        "Responder dudas de clientes",
                        "Crear contenido para redes",
                        "Analizar documentos",
                        "Ayudarme con programación",
                      ].map((example) => (
                        <button
                          type="button"
                          key={example}
                          onClick={() => setText(`Quiero un agente para ${example.toLowerCase()}`)}
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
                        ? "Pega aquí todas las instrucciones, reglas y formato de respuesta…"
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
                <section className="agent-builder-preview" aria-label="Borrador del agente">
                  <div className="agent-builder-preview-header">
                    <div>
                      <span className="agent-builder-ready">Borrador listo</span>
                      <h3>Revisa los detalles</h3>
                    </div>
                  </div>
                  <label>
                    Nombre
                    <input
                      className="input"
                      value={draft.name}
                      onChange={(event) =>
                        setDraft({ ...draft, name: event.target.value })
                      }
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
                    Instrucciones
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
                      disabled={
                        saving || !draft.name.trim() || !draft.system_prompt.trim()
                      }
                    >
                      {saving ? "Guardando…" : "Crear agente"}
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
