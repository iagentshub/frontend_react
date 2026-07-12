import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryClient, queryKeys } from "@/api/query-client";
import { ChatDialog } from "./chat-dialog";
import "../../../assets/components/agent-card/agent-card.css";
import "../../../assets/components/filter_agents/filter_agents.css";
import "../../../assets/components/agent-catalog/agent-catalog.css";
import "../../../assets/components/action-menu/action-menu.css";
import "../../../assets/components/group-panel/group-panel.css";
import "../../../assets/components/group-share-dialog/group-share-dialog.css";
import "@/styles/routes/agents/agents.css";

interface Agent {
  id: string;
  name?: string;
  description?: string;
  model?: string;
  connection_id?: string;
  scope?: "private" | "public";
  labels?: string[];
  use_memory?: boolean;
  origin_type?: string;
  tokens_in?: number;
  tokens_out?: number;
  _shared?: boolean;
  _social_public?: boolean;
  _social_stars?: number;
  _social_verified?: boolean;
  system_prompt?: string;
  temperature?: number;
  skills?: string[];
  knowledge?: string[];
  op_connections?: string[];
  memory_file?: string | null;
  agent_type?: string;
  effort_level?: string | null;
  timeout?: number | null;
}
interface Connection {
  id: string;
  name?: string;
  type?: string;
  _shared?: boolean;
}
interface SelectItem {
  id: string;
  name?: string;
  title?: string;
  type?: string;
}
interface Workspace {
  id: string;
  name: string;
  type?: string;
}
interface AgentData {
  agents: Agent[];
  connections: Connection[];
  skills: SelectItem[];
  knowledge: SelectItem[];
  memories: SelectItem[];
  workspaces: Workspace[];
}

const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777", "#0f766e"];
const providerNames: Record<string, string> = {
  openai: "OpenAI",
  claude: "Claude",
  anthropic: "Claude",
  gemini: "Gemini",
  google: "Gemini",
  ollama: "Ollama",
};
function avatarColor(name: string) {
  return colors[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % colors.length];
}
function tokens(n: number) {
  return n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
      : String(n);
}

async function loadAgents(signal: AbortSignal): Promise<AgentData> {
  const safe = <T,>(url: string) => api.get<T[]>(url, signal).catch(() => []);
  const [agents, connections, skills, knowledge, memories, workspaces] = await Promise.all([
    api.get<Agent[]>("/api/agents", signal),
    api.get<Connection[]>("/api/connections", signal),
    safe<SelectItem>("/api/skills"),
    safe<SelectItem>("/api/knowledge"),
    safe<SelectItem>("/api/memory"),
    safe<Workspace>("/api/workspaces"),
  ]);
  return { agents, connections, skills, knowledge, memories, workspaces };
}

function Icon({ kind }: { kind: "chat" | "view" | "edit" | "delete" | "export" }) {
  if (kind === "chat")
    return (
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l2 2 2-2h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "view")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  if (kind === "edit")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M10.8 2.2l3 3L5 14H2v-3z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (kind === "export")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 2v8M5 7l3 3 3-3M3 13h10"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgentCard({
  agent,
  connections,
  onDelete,
  onEdit,
  onChat,
  onExport,
  onShare,
}: {
  agent: Agent;
  connections: Connection[];
  onDelete: (agent: Agent) => void;
  onEdit: (agent: Agent) => void;
  onChat: (agent: Agent) => void;
  onExport: (agent: Agent) => void;
  onShare: (agent: Agent) => void;
}) {
  const connection = connections.find((c) => c.id === agent.connection_id),
    provider = (connection?.type ?? "").toLowerCase(),
    total = (agent.tokens_in ?? 0) + (agent.tokens_out ?? 0);
  const blocked = (agent.labels ?? []).some((label) =>
    ["draft", "quarantine", "archived", "delete"].includes(label),
  );
  return (
    <article className={`agent-card${blocked ? " agent-card--blocked" : ""}`}>
      <div className="agent-card-body">
        <div className="agent-card-top">
          <div className="agent-avatar" style={{ background: avatarColor(agent.name ?? "") }}>
            {(agent.name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="agent-card-info">
            <div className="agent-card-name-row">
              <span className="agent-card-name" title={agent.name}>
                {agent.name ?? "Agente"}
              </span>
              {agent._social_public && (
                <span className="agent-scope-badge agent-scope-badge--social">◎</span>
              )}
              {Boolean(agent._social_stars) && (
                <span className="agent-scope-badge agent-scope-badge--stars">
                  ★ {agent._social_stars}
                </span>
              )}
              {agent._social_verified && (
                <span className="agent-scope-badge agent-scope-badge--verified">✓ Verificado</span>
              )}
            </div>
            <div className="agent-card-meta">
              <span
                className={`agent-conn-pill agent-conn-pill--${provider || (agent.scope === "public" ? "usatia" : "default")}`}
              >
                {connection
                  ? (providerNames[provider] ?? provider)
                  : agent.scope === "public"
                    ? "Usa tu IA"
                    : "Sin IA"}
              </span>
              {total > 0 && <span className="agent-tok-badge">{tokens(total)} tok</span>}
            </div>
          </div>
        </div>
        <p className="agent-card-desc">{agent.description || "Sin descripción"}</p>
        {(agent.labels?.length || agent.origin_type) && (
          <div className="label-chips-row agent-label-chips">
            {agent.origin_type && (
              <span className="label-chip" style={{ "--lc": "#059669" } as React.CSSProperties}>
                {agent.origin_type === "linked"
                  ? "Enlazado"
                  : agent.origin_type === "fork"
                    ? "Fork"
                    : "Propietario"}
              </span>
            )}
            {agent.labels?.map((label) => (
              <span className="label-chip" key={label}>
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="agent-card-footer">
        <button
          className="agent-action-chat"
          disabled={!connection || blocked}
          title={!connection ? "Configura una conexión para chatear" : ""}
          onClick={() => onChat(agent)}
        >
          <Icon kind="chat" />
          Chat
        </button>
        <div className="agent-card-actions-right">
          <button className="agent-action-icon" title="Ver y editar" onClick={() => onEdit(agent)}>
            <Icon kind="view" />
          </button>
          {!agent._shared && (
            <>
              <button
                className="agent-action-icon"
                title="Exportar"
                onClick={() => onExport(agent)}
              >
                <Icon kind="export" />
              </button>
              <button
                className="agent-action-icon"
                title="Compartir con grupos"
                onClick={() => onShare(agent)}
              >
                ⌯
              </button>
              <button className="agent-action-icon" title="Editar" onClick={() => onEdit(agent)}>
                <Icon kind="edit" />
              </button>
              <button
                className="agent-action-icon agent-action-icon--danger"
                title="Eliminar"
                onClick={() => onDelete(agent)}
              >
                <Icon kind="delete" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function AgentEditor({
  agent,
  data,
  onClose,
  onSaved,
}: {
  agent: Agent | null;
  data: AgentData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab] = useState(1),
    [name, setName] = useState(agent?.name ?? ""),
    [description, setDescription] = useState(agent?.description ?? ""),
    [prompt, setPrompt] = useState(agent?.system_prompt ?? ""),
    [connectionId, setConnectionId] = useState(agent?.connection_id ?? ""),
    [scope, setScope] = useState(agent?.scope ?? "private"),
    [temperature, setTemperature] = useState(agent?.temperature ?? 0.7),
    [skillIds, setSkillIds] = useState(agent?.skills ?? []),
    [knowledgeIds, setKnowledgeIds] = useState(agent?.knowledge ?? []),
    [useMemory, setUseMemory] = useState(Boolean(agent?.use_memory)),
    [memoryFile, setMemoryFile] = useState(agent?.memory_file ?? ""),
    [agentType, setAgentType] = useState(agent?.agent_type ?? "generic"),
    [effort, setEffort] = useState(agent?.effort_level ?? ""),
    [timeout, setTimeoutValue] = useState(agent?.timeout?.toString() ?? "");
  const toggle = (values: string[], id: string, set: (next: string[]) => void) =>
    set(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const save = useMutation({
    mutationFn: () =>
      api.post<Agent>("/api/agents", {
        ...(agent?.id ? { id: agent.id } : {}),
        name: name.trim(),
        description: description.trim(),
        agent_type: agentType,
        connection_id: connectionId || null,
        system_prompt: prompt.trim(),
        temperature,
        effort_level: effort || null,
        timeout: timeout === "" ? null : Number(timeout),
        skills: skillIds,
        knowledge: knowledgeIds,
        op_connections: agent?.op_connections ?? [],
        use_memory: useMemory,
        memory_file: useMemory ? memoryFile || null : null,
        routines: [],
        scope,
        labels: scope === "public" ? ["public"] : ["private"],
      }),
    onSuccess: onSaved,
  });
  const tabNames = ["Básico", "Conexiones", "Conocimiento", "Avanzado"];
  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="agent-editor-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ width: 560 }}>
        <div className="modal-header">
          <span className="modal-title" id="agent-editor-title">
            {agent ? "Editar agente" : "Nuevo agente"}
          </span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim()) save.mutate();
          }}
        >
          <div className="agent-tabs">
            {tabNames.map((label, index) => (
              <button
                type="button"
                className={`agent-tab${tab === index + 1 ? " active" : ""}`}
                onClick={() => setTab(index + 1)}
                key={label}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="modal-body agent-step-panel">
            {tab === 1 && (
              <>
                <div className="field">
                  <label htmlFor="agent-name-react">Nombre *</label>
                  <input
                    id="agent-name-react"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Mi agente"
                    required
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label htmlFor="agent-desc-react">Descripción</label>
                  <input
                    id="agent-desc-react"
                    className="input"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Para qué sirve este agente"
                  />
                </div>
                <div className="field">
                  <label htmlFor="agent-scope-react">Etiquetas</label>
                  <div className="wcfg-pills">
                    <label className="wcfg-pill">
                      <input
                        type="radio"
                        checked={scope === "private"}
                        onChange={() => setScope("private")}
                      />
                      <span className="wcfg-pill-label">Privado</span>
                    </label>
                    <label className="wcfg-pill">
                      <input
                        type="radio"
                        checked={scope === "public"}
                        onChange={() => setScope("public")}
                      />
                      <span className="wcfg-pill-label">Público</span>
                    </label>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="agent-prompt-react">Instrucciones</label>
                  <textarea
                    id="agent-prompt-react"
                    className="textarea"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Describe el rol de este agente…"
                    style={{ minHeight: 160 }}
                  />
                </div>
              </>
            )}
            {tab === 2 && (
              <>
                <div className="field">
                  <label htmlFor="agent-conn-react">API LLM</label>
                  <select
                    id="agent-conn-react"
                    className="select"
                    value={connectionId}
                    onChange={(event) => setConnectionId(event.target.value)}
                  >
                    <option value="">-- Sin conexión --</option>
                    {data.connections
                      .filter((c) => !c._shared)
                      .map((c) => (
                        <option value={c.id} key={c.id}>
                          {c.name ?? c.type ?? c.id}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="agent-temp-react">Temperatura ⓘ</label>
                  <div className="range-wrap">
                    <input
                      id="agent-temp-react"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={temperature}
                      onChange={(event) => setTemperature(Number(event.target.value))}
                    />
                    <span className="range-val">{temperature.toFixed(2)}</span>
                  </div>
                </div>
                <div className="field">
                  <label>Accesos del agente</label>
                  <span className="input-hint">
                    Conexiones SSH, bases de datos y máquinas que el agente puede usar como
                    herramienta.
                  </span>
                  <div className="agent-knowledge-list">
                    {data.connections
                      .filter(
                        (c) => !["openai", "claude", "gemini", "ollama"].includes(c.type ?? ""),
                      )
                      .map((c) => (
                        <label className="knowledge-picker-item" key={c.id}>
                          <input type="checkbox" disabled />
                          <span className="knowledge-picker-title">{c.name ?? c.type}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </>
            )}
            {tab === 3 && (
              <>
                <div className="field field-memory">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      className="toggle-checkbox"
                      checked={useMemory}
                      onChange={(event) => setUseMemory(event.target.checked)}
                    />
                    <span className="toggle-track" />
                    Habilitar memoria
                  </label>
                  {useMemory && (
                    <select
                      className="select"
                      value={memoryFile}
                      onChange={(event) => setMemoryFile(event.target.value)}
                    >
                      <option value="">Archivo por defecto</option>
                      {data.memories.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name ?? item.title ?? item.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="field">
                  <label>Skills</label>
                  <div className="agent-knowledge-list">
                    {data.skills.length ? (
                      data.skills.map((item) => (
                        <label className="knowledge-picker-item" key={item.id}>
                          <input
                            type="checkbox"
                            checked={skillIds.includes(item.id)}
                            onChange={() => toggle(skillIds, item.id, setSkillIds)}
                          />
                          <span className="knowledge-picker-title">
                            {item.name ?? item.title ?? item.id}
                          </span>
                        </label>
                      ))
                    ) : (
                      <span className="input-hint">No hay skills disponibles.</span>
                    )}
                  </div>
                </div>
                <div className="field">
                  <label>Webs y documentos</label>
                  <div className="agent-knowledge-list">
                    {data.knowledge.length ? (
                      data.knowledge.map((item) => (
                        <label className="knowledge-picker-item" key={item.id}>
                          <input
                            type="checkbox"
                            checked={knowledgeIds.includes(item.id)}
                            onChange={() => toggle(knowledgeIds, item.id, setKnowledgeIds)}
                          />
                          <span className="knowledge-picker-title">
                            {item.title ?? item.name ?? item.id}
                          </span>
                        </label>
                      ))
                    ) : (
                      <span className="input-hint">No hay conocimiento disponible.</span>
                    )}
                  </div>
                </div>
              </>
            )}
            {tab === 4 && (
              <>
                <div className="field">
                  <label htmlFor="agent-type-react">Tipo de agente</label>
                  <select
                    id="agent-type-react"
                    className="select"
                    value={agentType}
                    onChange={(event) => setAgentType(event.target.value)}
                  >
                    <option value="generic">Genérico</option>
                    <option value="claude">Claude</option>
                    <option value="openai">OpenAI</option>
                    <option value="github">GitHub Copilot</option>
                  </select>
                </div>
                <div className="form-row-2">
                  <div className="field">
                    <label htmlFor="agent-effort-react">Nivel de esfuerzo</label>
                    <select
                      id="agent-effort-react"
                      className="select"
                      value={effort}
                      onChange={(event) => setEffort(event.target.value)}
                    >
                      <option value="">Auto</option>
                      <option value="low">Bajo</option>
                      <option value="medium">Medio</option>
                      <option value="high">Alto</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="agent-timeout-react">Timeout del chat</label>
                    <select
                      id="agent-timeout-react"
                      className="select"
                      value={timeout}
                      onChange={(event) => setTimeoutValue(event.target.value)}
                    >
                      <option value="">Usar preferencia global</option>
                      <option value="0">Indefinido</option>
                      <option value="60">1 minuto</option>
                      <option value="120">2 minutos</option>
                      <option value="300">5 minutos</option>
                      <option value="600">10 minutos</option>
                    </select>
                  </div>
                </div>
                {agentType === "claude" && (
                  <div className="platform-section">
                    <div className="platform-section-title">Opciones Claude</div>
                    <p className="input-hint">
                      La configuración específica y las rutinas se incorporarán en el siguiente
                      corte.
                    </p>
                  </div>
                )}
              </>
            )}
            {save.isError && (
              <div className="form-error" role="alert">
                No se pudo guardar el agente.
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={save.isPending || !name.trim()}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ShareDialog({
  agent,
  groups,
  onClose,
}: {
  agent: Agent;
  groups: Workspace[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const save = useMutation({
    mutationFn: async () => {
      for (const groupId of selected)
        await api.post(`/api/sharing/agent/${encodeURIComponent(agent.id)}`, { group_id: groupId });
    },
    onSuccess: onClose,
  });
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Compartir — {agent.name}</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="gsd-subtitle">Selecciona los grupos</p>
          <div className="gsd-groups">
            {groups.length ? (
              groups.map((group) => (
                <label className="gsd-group-row" key={group.id}>
                  <input
                    type="checkbox"
                    className="gsd-checkbox"
                    checked={selected.includes(group.id)}
                    onChange={() =>
                      setSelected((values) =>
                        values.includes(group.id)
                          ? values.filter((id) => id !== group.id)
                          : [...values, group.id],
                      )
                    }
                  />
                  <span className="gsd-group-name">{group.name}</span>
                  {selected.includes(group.id) && <span className="gsd-badge">Compartido</span>}
                </label>
              ))
            ) : (
              <p className="gsd-empty">No tienes grupos de trabajo.</p>
            )}
          </div>
          {save.isError && <div className="form-error">No se pudo compartir.</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const download = async (format: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agent.id)}/export/${format}`, {
        headers: { "Accept-Language": document.documentElement.lang || "es" },
      });
      if (!response.ok) throw new Error("No se pudo exportar el agente");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${agent.id}-${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error de exportación");
    }
  };
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">Exportar {agent.name}</span>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="input-hint">Elige el formato de destino.</p>
          <div className="export-options">
            {[
              ["openai", "OpenAI Assistant"],
              ["claude", "Claude / CLAUDE.md"],
              ["github", "GitHub Copilot"],
              ["mcp", "MCP"],
            ].map(([format, label]) => (
              <button
                className="export-opt"
                key={format}
                onClick={() => void download(format ?? "openai")}
              >
                <span className="export-opt-icon">⇩</span>
                <span>
                  <span className="export-opt-label">{label}</span>
                  <span className="export-opt-sub">Descargar configuración compatible</span>
                </span>
              </button>
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({
  label,
  count,
  open,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fa-dropdown-wrap">
      <button
        type="button"
        className={`fa-filter-btn${count ? " fa-filter-btn--active" : ""}`}
        onClick={onToggle}
      >
        {label}
        {count > 0 && <span className="fa-filter-count">{count}</span>}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M2 3.5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="fa-panel">
          <div className="fa-panel-list">{children}</div>
        </div>
      )}
    </div>
  );
}

function FilterOption({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`fa-option${active ? " fa-option--active" : ""}`}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      <span className="fa-option-check">{active ? "✓" : ""}</span>
      {color && <span className="fa-lbl-dot" style={{ background: color }} />}
      <span className="fa-option-label">{label}</span>
    </button>
  );
}

export function AgentsPage() {
  const query = useQuery({
      queryKey: queryKeys.agents(),
      queryFn: ({ signal }) => loadAgents(signal),
    }),
    [search, setSearch] = useState(""),
    [memory, setMemory] = useState(""),
    [skillIds, setSkillIds] = useState<string[]>([]),
    [connectionIds, setConnectionIds] = useState<string[]>([]),
    [knowledgeIds, setKnowledgeIds] = useState<string[]>([]),
    [labels, setLabels] = useState<string[]>([]),
    [openFilter, setOpenFilter] = useState<string | null>(null),
    [editor, setEditor] = useState<Agent | null | undefined>(undefined),
    [chat, setChat] = useState<Agent | null>(null),
    [newMenu, setNewMenu] = useState(false),
    [catalog, setCatalog] = useState(false),
    [catalogSearch, setCatalogSearch] = useState(""),
    [exportAgent, setExportAgent] = useState<Agent | null>(null),
    [shareAgent, setShareAgent] = useState<Agent | null>(null),
    [groupsOpen, setGroupsOpen] = useState(true),
    [activeGroup, setActiveGroup] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const groupAgents = useQuery({
    queryKey: ["agents", "group", activeGroup],
    enabled: Boolean(activeGroup),
    queryFn: ({ signal }) =>
      api.get<Agent[]>(`/api/agents?group_id=${encodeURIComponent(activeGroup ?? "")}`, signal),
  });
  const remove = useMutation({
    mutationFn: (agent: Agent) => api.delete(`/api/agents/${encodeURIComponent(agent.id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (activeGroup ? (groupAgents.data ?? []) : (query.data?.agents ?? [])).filter((agent) => {
      return (
        (!q ||
          `${agent.name ?? ""} ${agent.description ?? ""} ${agent.model ?? ""}`
            .toLowerCase()
            .includes(q)) &&
        (!skillIds.length || skillIds.some((id) => agent.skills?.includes(id))) &&
        (!connectionIds.length || connectionIds.includes(agent.connection_id ?? "")) &&
        (!knowledgeIds.length || knowledgeIds.some((id) => agent.knowledge?.includes(id))) &&
        (!labels.length || labels.some((label) => (agent.labels ?? []).includes(label))) &&
        (!memory || (memory === "yes" ? Boolean(agent.use_memory) : !agent.use_memory))
      );
    });
  }, [
    query.data,
    groupAgents.data,
    activeGroup,
    search,
    skillIds,
    connectionIds,
    knowledgeIds,
    labels,
    memory,
  ]);
  const clear = () => {
      setSearch("");
      setMemory("");
      setSkillIds([]);
      setConnectionIds([]);
      setKnowledgeIds([]);
      setLabels([]);
    },
    active = Boolean(
      search ||
      memory ||
      skillIds.length ||
      connectionIds.length ||
      knowledgeIds.length ||
      labels.length,
    );
  const toggleValue = (values: string[], value: string, update: (next: string[]) => void) =>
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const confirmDelete = (agent: Agent) => {
    if (window.confirm(`¿Eliminar el agente “${agent.name ?? "Agente"}”?`)) remove.mutate(agent);
  };
  const openEditor = async (agent: Agent) => {
    try {
      setEditor(await api.get<Agent>(`/api/agents/${encodeURIComponent(agent.id)}`));
    } catch {
      setEditor(agent);
    }
  };
  const importFile = (file?: File) => {
    if (!file) return;
    void file.text().then((content) => {
      try {
        const parsed = file.name.toLowerCase().endsWith(".json")
          ? (JSON.parse(content) as Agent)
          : null;
        setEditor(
          parsed
            ? { ...parsed, id: "" }
            : {
                id: "",
                name: file.name.replace(/\.(md|json)$/i, ""),
                description: "Importado desde archivo",
                system_prompt: content,
              },
        );
      } catch {
        setEditor({ id: "", name: file.name.replace(/\.(md|json)$/i, ""), system_prompt: content });
      }
    });
  };
  return (
    <main className="page-content agents-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agentes</h1>
          <p className="page-subtitle">Gestiona y chatea con tus agentes de IA</p>
        </div>
        <div className="page-actions" style={{ position: "relative" }}>
          <button
            id="btn-new-agent"
            type="button"
            className="btn btn-primary"
            onClick={() => setNewMenu((value) => !value)}
            aria-expanded={newMenu}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            <span>Nuevo</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 2, opacity: .7 }} aria-hidden="true"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {newMenu && (
            <div className="action-menu" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)" }}>
              <div className="am-opts">
                <button
                  className="am-opt"
                  onClick={() => {
                    setCatalog(true);
                    setNewMenu(false);
                  }}
                >
                  <span className="am-opt-icon">▦</span>
                  <span className="am-opt-text">
                    <span className="am-opt-label">Desde el catálogo</span>
                    <span className="am-opt-sub">Usa un agente público como base</span>
                  </span>
                </button>
                <button className="am-opt" onClick={() => fileInput.current?.click()}>
                  <span className="am-opt-icon">⇧</span>
                  <span className="am-opt-text">
                    <span className="am-opt-label">Desde un archivo</span>
                    <span className="am-opt-sub">Importa .md o .json</span>
                  </span>
                </button>
                <button
                  className="am-opt"
                  onClick={() => {
                    setEditor(null);
                    setNewMenu(false);
                  }}
                >
                  <span className="am-opt-icon">＋</span>
                  <span className="am-opt-text">
                    <span className="am-opt-label">Desde cero</span>
                    <span className="am-opt-sub">Configura todos los campos</span>
                  </span>
                </button>
              </div>
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept=".json,.md"
            hidden
            onChange={(event) => {
              importFile(event.target.files?.[0]);
              event.currentTarget.value = "";
              setNewMenu(false);
            }}
          />
        </div>
      </div>
      <div className="fa-bar">
        <div className="fa-search-wrap">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
            <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            className="fa-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o descripción…"
            aria-label="Buscar agentes"
          />
          {search && (
            <button
              className="fa-search-clear"
              onClick={() => setSearch("")}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          )}
        </div>
        <div className="fa-filter-group">
          <FilterDropdown
            label="Habilidades"
            count={skillIds.length}
            open={openFilter === "skills"}
            onToggle={() => setOpenFilter(openFilter === "skills" ? null : "skills")}
          >
            {query.data?.skills.map((item) => (
              <FilterOption
                key={item.id}
                label={item.name ?? item.title ?? item.id}
                active={skillIds.includes(item.id)}
                onClick={() => toggleValue(skillIds, item.id, setSkillIds)}
              />
            ))}
          </FilterDropdown>
          <FilterDropdown
            label="Conexión"
            count={connectionIds.length}
            open={openFilter === "connections"}
            onToggle={() => setOpenFilter(openFilter === "connections" ? null : "connections")}
          >
            {query.data?.connections.map((item) => (
              <FilterOption
                key={item.id}
                label={`${item.name ?? item.id} · ${providerNames[item.type ?? ""] ?? item.type ?? ""}`}
                active={connectionIds.includes(item.id)}
                onClick={() => toggleValue(connectionIds, item.id, setConnectionIds)}
              />
            ))}
          </FilterDropdown>
          <FilterDropdown
            label="Conocimiento"
            count={knowledgeIds.length}
            open={openFilter === "knowledge"}
            onToggle={() => setOpenFilter(openFilter === "knowledge" ? null : "knowledge")}
          >
            {query.data?.knowledge.map((item) => (
              <FilterOption
                key={item.id}
                label={item.title ?? item.name ?? item.id}
                active={knowledgeIds.includes(item.id)}
                onClick={() => toggleValue(knowledgeIds, item.id, setKnowledgeIds)}
              />
            ))}
          </FilterDropdown>
          <FilterDropdown
            label="Memoria"
            count={memory ? 1 : 0}
            open={openFilter === "memory"}
            onToggle={() => setOpenFilter(openFilter === "memory" ? null : "memory")}
          >
            <FilterOption
              label="Con memoria"
              active={memory === "yes"}
              onClick={() => setMemory(memory === "yes" ? "" : "yes")}
            />
            <FilterOption
              label="Sin memoria"
              active={memory === "no"}
              onClick={() => setMemory(memory === "no" ? "" : "no")}
            />
          </FilterDropdown>
          <FilterDropdown
            label="Estado"
            count={labels.length}
            open={openFilter === "labels"}
            onToggle={() => setOpenFilter(openFilter === "labels" ? null : "labels")}
          >
            {([
              ["public", "Público", "#10b981"],
              ["production", "Producción", "#0891b2"],
              ["staging", "Staging", "#64748b"],
              ["development", "Desarrollo", "#f59e0b"],
              ["test", "Test", "#8b5cf6"],
              ["fork", "fork", "#94a3b8"],
              ["linked", "linked", "#94a3b8"],
              ["favorite", "Favorito", "#f59e0b"],
              ["draft", "Borrador", "#8b5cf6"],
              ["review", "Revisión", "#f97316"],
              ["deprecated", "Obsoleto", "#ca8a04"],
              ["quarantine", "Cuarentena", "#ef4444"],
              ["archived", "Archivado", "#94a3b8"],
              ["delete", "Eliminar", "#dc2626"],
            ] as const).map(([label, text, color]) => (
              <FilterOption
                key={label}
                label={text}
                color={color}
                active={labels.includes(label)}
                onClick={() => toggleValue(labels, label, setLabels)}
              />
            ))}
          </FilterDropdown>
          {active && (
            <button className="fa-clear-all" onClick={clear}>
              Limpiar
            </button>
          )}
        </div>
      </div>
      <div className="af-wrapper">
        <div className="folder-toggle-row">
          <span className="folder-resource-icon" title="Carpetas" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1.5 4.5h5l1.5 2h6.5v7H1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><path d="M1.5 4.5V3h4l1.5 1.5" stroke="currentColor" strokeWidth="1.4"/></svg></span>
          <button
            className={`folder-toggle-btn${groupsOpen ? " folder-toggle-btn--on" : ""}`}
            title="Grupos de trabajo"
            onClick={() => setGroupsOpen((value) => !value)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M9 9.2A3.5 3.5 0 0 1 14.5 12.5V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="af-layout">
          {groupsOpen && (
            <aside className="af-groups-panel">
              <div className="kf-section-header">
                <span className="kf-section-label">Grupos</span>
                <button className="kf-add-btn" title="Nuevo grupo">
                  ＋
                </button>
              </div>
              <button
                className={`kf-item${activeGroup === null ? " kf-item--active" : ""}`}
                onClick={() => setActiveGroup(null)}
              >
                <span className="kf-item-name">Todos</span>
              </button>
              {query.data?.workspaces
                .filter((group) => group.type === "team")
                .map((group) => (
                  <button
                    className={`kf-item gp-item${activeGroup === group.id ? " kf-item--active" : ""}`}
                    key={group.id}
                    onClick={() => setActiveGroup(group.id)}
                  >
                    <span className="kf-item-name">{group.name}</span>
                  </button>
                ))}
            </aside>
          )}
          <div className="af-content">
            {remove.isError && (
              <div className="form-error" role="alert">
                No se pudo eliminar el agente.
              </div>
            )}
            {query.isPending ? (
              <div className="empty-state">Cargando agentes…</div>
            ) : query.isError ? (
              <div className="empty-state">
                <p>No se pudieron cargar los agentes.</p>
                <button className="btn btn-primary" onClick={() => void query.refetch()}>
                  Reintentar
                </button>
              </div>
            ) : filtered.length ? (
              <div className="agents-grid">
                {filtered.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    connections={query.data.connections}
                    onDelete={confirmDelete}
                    onEdit={(agent) => void openEditor(agent)}
                    onChat={setChat}
                    onExport={setExportAgent}
                    onShare={setShareAgent}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  aria-hidden="true"
                >
                  <rect x="4" y="9" width="16" height="12" rx="3" />
                  <path d="M9 9V7a3 3 0 0 1 6 0v2" />
                  <circle cx="9" cy="15" r="1.2" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="15" r="1.2" fill="currentColor" stroke="none" />
                </svg>
                <p>
                  {active
                    ? "No hay agentes que coincidan con los filtros."
                    : "Todavía no tienes agentes."}
                </p>
              </div>
            )}
            {editor !== undefined && query.data && (
              <AgentEditor
                agent={editor}
                data={query.data}
                onClose={() => setEditor(undefined)}
                onSaved={() => {
                  setEditor(undefined);
                  void query.refetch();
                }}
              />
            )}
            {chat && <ChatDialog agent={chat} onClose={() => setChat(null)} />}
            {catalog && (
              <div className="modal-bg" role="dialog" aria-modal="true">
                <div className="modal-box" style={{ width: 760 }}>
                  <div className="modal-header">
                    <span className="modal-title">Catálogo de agentes</span>
                    <button className="modal-close" onClick={() => setCatalog(false)}>
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="ac-search-wrap">
                      <input
                        className="input"
                        placeholder="Buscar agentes públicos…"
                        value={catalogSearch}
                        onChange={(event) => setCatalogSearch(event.target.value)}
                      />
                    </div>
                    <div className="ac-grid">
                      {(query.data?.agents ?? [])
                        .filter(
                          (agent) =>
                            (agent.scope === "public" || agent._shared) &&
                            `${agent.name ?? ""} ${agent.description ?? ""}`
                              .toLowerCase()
                              .includes(catalogSearch.toLowerCase()),
                        )
                        .map((agent) => (
                          <div className="ac-card" key={agent.id}>
                            <div className="ac-card-body">
                              <div className="ac-card-name">{agent.name}</div>
                              <div className="ac-card-desc">
                                {agent.description || "Sin descripción"}
                              </div>
                            </div>
                            <div className="ac-card-footer">
                              <button
                                className="ac-fork-btn"
                                onClick={() => {
                                  setEditor({ ...agent, id: "", origin_type: "fork" });
                                  setCatalog(false);
                                }}
                              >
                                Usar como base
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {exportAgent && (
              <ExportDialog agent={exportAgent} onClose={() => setExportAgent(null)} />
            )}
            {shareAgent && query.data && (
              <ShareDialog
                agent={shareAgent}
                groups={query.data.workspaces.filter((group) => group.type === "team")}
                onClose={() => setShareAgent(null)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

