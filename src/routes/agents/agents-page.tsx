import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryClient, queryKeys } from "@/api/query-client";
import {
  AgentGlyph,
  DeleteActionIcon,
  agentIconOptions,
  normalizeAgentIcon,
  type AgentIconName,
} from "@/components/resource-icons";
import { ResourceHistoryButton } from "@/components/resource-history-dialog";
import { LabelChips, OriginChip } from "@/components/label-chips";
import { FilterDropdown, FilterOption, toggleValue } from "@/components/filter-dropdown";
import { ChatDialog } from "./chat-dialog";
import { AgentBuilderDialog } from "./agent-builder-dialog";
import "../../../assets/components/agent-card/agent-card.css";
import "../../../assets/components/filter_agents/filter_agents.css";
import "../../../assets/components/agent-catalog/agent-catalog.css";
import "../../../assets/components/action-menu/action-menu.css";
import "../../../assets/components/group-panel/group-panel.css";
import "../../../assets/components/group-share-dialog/group-share-dialog.css";
import "../../../assets/css/labels.css";
import "@/styles/routes/agents/agents.css";

interface Agent {
  id: string;
  name?: string;
  description?: string;
  icon?: string;
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
  routines?: Routine[];
  extended_thinking?: boolean;
  thinking_budget_tokens?: number;
  cache_control?: boolean;
  response_format?: string;
  tool_choice?: string;
  frequency_penalty?: number;
  presence_penalty?: number;
  copilot_topic?: string;
  include_repo_context?: boolean;
  category?: string;
  trial_missing_deps?: string;
}
interface Routine {
  name: string;
  trigger_type: "manual" | "scheduled" | "webhook";
  schedule?: string;
  prompt: string;
}
interface ScannedSkill {
  path: string;
  name: string;
  description: string;
  content: string;
}
interface ImportScan {
  agents: Array<{ path: string; agent: Agent }>;
  skills: ScannedSkill[];
  warnings: string[];
}
interface Connection {
  id: string;
  name?: string;
  type?: string;
  model?: string;
  _shared?: boolean;
}
interface SelectItem {
  id: string;
  name?: string;
  title?: string;
  type?: string;
}
interface Group {
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
  groups: Group[];
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

function parseAgentFile(filename: string, content: string): Agent {
  if (filename.toLowerCase().endsWith(".json")) {
    const value = JSON.parse(content) as Record<string, unknown>;
    const source = (value.agent && typeof value.agent === "object" ? value.agent : value) as Record<
      string,
      unknown
    >;
    const text = (field: string, fallback = "") =>
      typeof source[field] === "string" ? source[field] : fallback;
    return {
      ...(source as unknown as Agent),
      id: "",
      name: text("name", text("title", filename.replace(/\.json$/i, ""))),
      system_prompt: text("system_prompt", text("instructions", text("prompt"))),
      agent_type: text("agent_type", source.instructions ? "openai" : "generic"),
    };
  }
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const meta: Record<string, string> = {};
  if (frontmatter) {
    for (const line of (frontmatter[1] ?? "").split(/\r?\n/)) {
      const match = line.match(/^([\w-]+):\s*(.*)$/);
      const key = match?.[1];
      const value = match?.[2];
      if (key && value !== undefined) meta[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  const body = frontmatter ? content.slice(frontmatter[0].length) : content;
  const lower = filename.toLowerCase();
  return {
    id: "",
    name: meta.name || filename.replace(/\.(agent\.)?md$/i, ""),
    description: meta.description || "",
    model: meta.model || "",
    agent_type:
      lower.includes("github") || /\.github[\\/]/i.test(filename)
        ? "github"
        : lower.includes("claude") || /\.claude[\\/]/i.test(filename)
          ? "claude"
          : "generic",
    system_prompt: body.trim(),
    skills: meta.skills
      ? meta.skills
          .replaceAll("[", "")
          .replaceAll("]", "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
  };
}

function parseSkillFile(path: string, content: string): ScannedSkill {
  const frontmatter = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const meta: Record<string, string> = {};
  if (frontmatter) {
    for (const line of (frontmatter[1] ?? "").split(/\r?\n/)) {
      const match = line.match(/^([\w-]+):\s*(.*)$/);
      if (match?.[1] && match[2] !== undefined) {
        meta[match[1]] = match[2].replace(/^["']|["']$/g, "");
      }
    }
  }
  const segments = path.replaceAll("\\", "/").split("/");
  const fallback = segments.at(-2) || segments.at(-1)?.replace(/\.md$/i, "") || "Skill";
  return {
    path,
    name: meta.name || fallback,
    description: meta.description || "",
    content: (frontmatter ? content.slice(frontmatter[0].length) : content).trim(),
  };
}

async function loadAgents(signal: AbortSignal): Promise<AgentData> {
  const safe = <T,>(url: string) => api.get<T[]>(url, signal).catch(() => []);
  const [agents, connections, skills, knowledge, memories, groups] = await Promise.all([
    api.get<Agent[]>("/api/agents", signal),
    api.get<Connection[]>("/api/connections", signal),
    safe<SelectItem>("/api/skills"),
    safe<SelectItem>("/api/knowledge"),
    safe<SelectItem>("/api/memory"),
    safe<Group>("/api/groups"),
  ]);
  return { agents, connections, skills, knowledge, memories, groups };
}

function Icon({ kind }: { kind: "chat" | "view" | "edit" | "delete" | "export" | "share" }) {
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
  if (kind === "share")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="12" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="4" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="m10.5 3.8-5 3.4m5 5-5-3.4"
          stroke="currentColor"
          strokeWidth="1.3"
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
  const { t } = useTranslation();
  const connection = connections.find((c) => c.id === agent.connection_id),
    provider = (connection?.type ?? "").toLowerCase(),
    total = (agent.tokens_in ?? 0) + (agent.tokens_out ?? 0);
  const blocked = (agent.labels ?? []).some((label) =>
    ["draft", "quarantine", "archived", "delete"].includes(label),
  );
  return (
    <article
      className={`agent-card${blocked ? " agent-card--blocked" : ""}`}
      draggable={!agent._shared && agent.scope !== "public"}
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-iagents-resource", agent.id);
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <div className="agent-card-body">
        <div className="agent-card-top">
          <div
            className="agent-avatar"
            style={{ background: avatarColor(agent.name ?? "") }}
            title={t(`agents.icons.${normalizeAgentIcon(agent.icon)}`)}
          >
            <AgentGlyph icon={agent.icon} size={21} />
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
                <span className="agent-scope-badge agent-scope-badge--verified">
                  {t("legacy.text_af51b215f9a2")}
                </span>
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
                    : t("agents.card.no_ai")}
              </span>

              {total > 0 && (
                <span className="agent-tok-badge">
                  {tokens(total)} {t("legacy.text_79bead8e6d65")}
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="agent-card-desc">
          {agent.description || i18n.t("dynamic.text_3f8d6232f5be")}
        </p>

        {(agent.labels?.length || agent.origin_type) && (
          <div className="label-chips-row agent-label-chips">
            <OriginChip originType={agent.origin_type} />

            <LabelChips labels={agent.labels} hidePrivate={false} bare />
          </div>
        )}
      </div>

      <div className="agent-card-footer">
        <button
          className="agent-action-chat"
          disabled={!connection || blocked}
          title={!connection ? i18n.t("dynamic.text_bad0e4bc2cb9") : ""}
          onClick={() => onChat(agent)}
        >
          <Icon kind="chat" />
          {t("agents.card.chat")}
        </button>

        <div className="agent-card-actions-right">
          <button
            className="agent-action-icon"
            title={t("legacy.text_5ca92e51deef")}
            onClick={() => onEdit(agent)}
          >
            <Icon kind="view" />
          </button>

          {!agent._shared && (
            <>
              <button
                className="agent-action-icon"
                title={t("common.actions.export")}
                onClick={() => onExport(agent)}
              >
                <Icon kind="export" />
              </button>

              <button
                className="agent-action-icon"
                title={t("legacy.text_3f5a069c03dd")}
                onClick={() => onShare(agent)}
              >
                <Icon kind="share" />
              </button>

              <button
                className="agent-action-icon"
                title={t("agents.modal.routine_edit")}
                onClick={() => onEdit(agent)}
              >
                <Icon kind="edit" />
              </button>

              <button
                className="agent-action-icon agent-action-icon--danger"
                title={t("admin.delete_btn")}
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
  const { t } = useTranslation();
  const [tab, setTab] = useState(1),
    [name, setName] = useState(agent?.name ?? ""),
    [description, setDescription] = useState(agent?.description ?? ""),
    [icon, setIcon] = useState<AgentIconName>(normalizeAgentIcon(agent?.icon)),
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
    [timeout, setTimeoutValue] = useState(agent?.timeout?.toString() ?? ""),
    [opConnections, setOpConnections] = useState(agent?.op_connections ?? []),
    [routines, setRoutines] = useState<Routine[]>(agent?.routines ?? []),
    [extendedThinking, setExtendedThinking] = useState(Boolean(agent?.extended_thinking)),
    [thinkingBudget, setThinkingBudget] = useState(agent?.thinking_budget_tokens ?? 10000),
    [cacheControl, setCacheControl] = useState(Boolean(agent?.cache_control)),
    [responseFormat, setResponseFormat] = useState(agent?.response_format ?? "text"),
    [toolChoice, setToolChoice] = useState(agent?.tool_choice ?? "auto"),
    [frequencyPenalty, setFrequencyPenalty] = useState(agent?.frequency_penalty ?? 0),
    [presencePenalty, setPresencePenalty] = useState(agent?.presence_penalty ?? 0),
    [copilotTopic, setCopilotTopic] = useState(agent?.copilot_topic ?? ""),
    [repoContext, setRepoContext] = useState(Boolean(agent?.include_repo_context)),
    [category, setCategory] = useState(agent?.category ?? "Other"),
    [trialMissingDeps, setTrialMissingDeps] = useState(agent?.trial_missing_deps ?? "warn");
  const toggle = (values: string[], id: string, set: (next: string[]) => void) =>
    set(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const save = useMutation({
    mutationFn: () =>
      api.post<Agent>("/api/agents", {
        ...(agent?.id ? { id: agent.id } : {}),
        name: name.trim(),
        description: description.trim(),
        icon,
        agent_type: agentType,
        connection_id: connectionId || null,
        system_prompt: prompt.trim(),
        temperature,
        effort_level: effort || null,
        timeout: timeout === "" ? null : Number(timeout),
        skills: skillIds,
        knowledge: knowledgeIds,
        op_connections: opConnections,
        use_memory: useMemory,
        memory_file: useMemory ? memoryFile || null : null,
        routines: routines.filter((routine) => routine.name.trim() && routine.prompt.trim()),
        scope,
        labels: [
          scope === "public" ? "public" : "private",
          ...(agent?.labels ?? []).filter((label) => !["public", "private"].includes(label)),
        ],
        category,
        trial_missing_deps: trialMissingDeps,
        extended_thinking: extendedThinking,
        thinking_budget_tokens: thinkingBudget,
        cache_control: cacheControl,
        response_format: responseFormat,
        tool_choice: toolChoice,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        copilot_topic: copilotTopic.trim(),
        include_repo_context: repoContext,
      }),
    onSuccess: onSaved,
  });
  const tabNames = [i18n.t("dynamic.text_303ce531ce64"), "Conexiones", "Conocimiento", "Avanzado"];
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
            {t(agent ? "agents.modal.title_edit" : "agents.modal.title_new")}
          </span>

          {agent?.id && (
            <ResourceHistoryButton
              type="agent"
              resourceId={agent.id}
              onRestored={() => {
                void queryClient.invalidateQueries({ queryKey: ["agents"] });
                onClose();
              }}
            />
          )}

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t("agents.chat.close")}
          >
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
                  <label htmlFor="agent-name-react">{t("legacy.text_209ebdec998e")}</label>

                  <input
                    id="agent-name-react"
                    className="input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={t("agents.modal.placeholder_name")}
                    required
                    autoFocus
                  />
                </div>

                <fieldset className="field agent-icon-field">
                  <legend>{t("legacy.text_c8fafac472b3")}</legend>

                  <span className="input-hint">{t("legacy.text_b8a9ed2385c0")}</span>

                  <div className="agent-icon-picker">
                    {agentIconOptions.map((option) => (
                      <button
                        type="button"
                        className={`agent-icon-option${icon === option.value ? " agent-icon-option--active" : ""}`}
                        aria-label={t(`agents.icons.${option.value}`)}
                        aria-pressed={icon === option.value}
                        title={t(`agents.icons.${option.value}`)}
                        onClick={() => setIcon(option.value)}
                        key={option.value}
                      >
                        <AgentGlyph icon={option.value} size={21} />

                        <span>{t(`agents.icons.${option.value}`)}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="field">
                  <label htmlFor="agent-desc-react">{t("agents.modal.field_description")}</label>

                  <input
                    id="agent-desc-react"
                    className="input"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("legacy.text_5ec2368d7a91")}
                  />
                </div>

                <div className="field">
                  <label htmlFor="agent-scope-react">{t("agents.modal.field_labels")}</label>

                  <div className="wcfg-pills">
                    <label className="wcfg-pill">
                      <input
                        type="radio"
                        checked={scope === "private"}
                        onChange={() => setScope("private")}
                      />

                      <span className="wcfg-pill-label">{t("agents.modal.scope_private")}</span>
                    </label>

                    <label className="wcfg-pill">
                      <input
                        type="radio"
                        checked={scope === "public"}
                        onChange={() => setScope("public")}
                      />

                      <span className="wcfg-pill-label">{t("agents.modal.scope_public")}</span>
                    </label>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="agent-prompt-react">{t("legacy.text_b838b37e8b1c")}</label>

                  <textarea
                    id="agent-prompt-react"
                    className="textarea"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={t("legacy.text_1bf32493d4f6")}
                    style={{ minHeight: 160 }}
                  />
                </div>
              </>
            )}

            {tab === 2 && (
              <>
                <div className="field">
                  <label htmlFor="agent-conn-react">{t("legacy.text_f33cb092b72d")}</label>

                  <select
                    id="agent-conn-react"
                    className="select"
                    value={connectionId}
                    onChange={(event) => setConnectionId(event.target.value)}
                  >
                    <option value="">{t("agents.modal.no_connection")}</option>

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
                  <label htmlFor="agent-temp-react">{t("legacy.text_42029f54dbba")}</label>

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
                  <label>{t("legacy.text_915469484ef8")}</label>

                  <span className="input-hint">{t("legacy.text_d382db5c47f8")}</span>

                  <div className="agent-knowledge-list">
                    {data.connections
                      .filter(
                        (c) => !["openai", "claude", "gemini", "ollama"].includes(c.type ?? ""),
                      )
                      .map((c) => (
                        <label className="knowledge-picker-item" key={c.id}>
                          <input
                            type="checkbox"
                            checked={opConnections.includes(c.id)}
                            onChange={() => toggle(opConnections, c.id, setOpConnections)}
                          />

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
                    {t("agents.modal.field_memory")}
                  </label>

                  {useMemory && (
                    <select
                      className="select"
                      value={memoryFile}
                      onChange={(event) => setMemoryFile(event.target.value)}
                    >
                      <option value="">{t("legacy.text_181a00ebfde7")}</option>

                      {data.memories.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.name ?? item.title ?? item.id}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="field">
                  <label>{t("agents.modal.tab_skills")}</label>

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
                      <span className="input-hint">{t("legacy.text_70f6295fef9b")}</span>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label>{t("legacy.text_661b3f2448d1")}</label>

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
                      <span className="input-hint">{t("legacy.text_cd24920fb2cf")}</span>
                    )}
                  </div>
                </div>
              </>
            )}

            {tab === 4 && (
              <>
                <div className="field">
                  <label htmlFor="agent-type-react">{t("agents.modal.field_agent_type")}</label>

                  <select
                    id="agent-type-react"
                    className="select"
                    value={agentType}
                    onChange={(event) => setAgentType(event.target.value)}
                  >
                    <option value="generic">{t("agents.modal.type_generic")}</option>

                    <option value="claude">{t("agents.modal.type_claude")}</option>

                    <option value="openai">{t("agents.modal.type_openai")}</option>

                    <option value="github">{t("agents.modal.type_github")}</option>
                  </select>
                </div>

                <div className="form-row-2">
                  <div className="field">
                    <label htmlFor="agent-effort-react">
                      {t("agents.modal.field_effort_level")}
                    </label>

                    <select
                      id="agent-effort-react"
                      className="select"
                      value={effort}
                      onChange={(event) => setEffort(event.target.value)}
                    >
                      <option value="">{t("legacy.text_c614ba7c453c")}</option>

                      <option value="low">{t("legacy.text_bb90d11dd0f2")}</option>

                      <option value="medium">{t("agents.modal.effort_medium")}</option>

                      <option value="high">{t("legacy.text_f46edd023686")}</option>
                    </select>
                  </div>

                  <div className="field">
                    <label htmlFor="agent-timeout-react">{t("agents.modal.field_timeout")}</label>

                    <select
                      id="agent-timeout-react"
                      className="select"
                      value={timeout}
                      onChange={(event) => setTimeoutValue(event.target.value)}
                    >
                      <option value="">{t("legacy.text_d71dcc854d0f")}</option>

                      <option value="0">{t("profile.timeout_indefinido")}</option>

                      <option value="60">{t("profile.timeout_1")}</option>

                      <option value="120">{t("profile.timeout_2")}</option>

                      <option value="300">{t("profile.timeout_5")}</option>

                      <option value="600">{t("profile.timeout_10")}</option>
                    </select>
                  </div>
                </div>

                {agentType === "claude" && (
                  <div className="platform-section">
                    <div className="platform-section-title">
                      {t("agents.modal.claude_section_title")}
                    </div>

                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={extendedThinking}
                        onChange={(event) => setExtendedThinking(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      {t("legacy.text_f1294d7c37c4")}
                    </label>

                    {extendedThinking && (
                      <div className="field">
                        <label>{t("legacy.text_57c4635fc081")}</label>
                        <input
                          className="input"
                          type="number"
                          min={1000}
                          step={1000}
                          value={thinkingBudget}
                          onChange={(event) => setThinkingBudget(Number(event.target.value))}
                        />
                      </div>
                    )}

                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={cacheControl}
                        onChange={(event) => setCacheControl(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      {t("legacy.text_339ec71307a2")}
                    </label>
                  </div>
                )}

                {agentType === "openai" && (
                  <div className="platform-section">
                    <div className="platform-section-title">
                      {t("agents.modal.openai_section_title")}
                    </div>

                    <div className="form-row-2">
                      <div className="field">
                        <label>{t("agents.modal.openai_response_format")}</label>
                        <select
                          className="select"
                          value={responseFormat}
                          onChange={(event) => setResponseFormat(event.target.value)}
                        >
                          <option value="text">{t("legacy.text_6eeba656c0f3")}</option>
                          <option value="json_object">{t("legacy.text_031a4e76f0b3")}</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>{t("legacy.text_78b828d86282")}</label>
                        <select
                          className="select"
                          value={toolChoice}
                          onChange={(event) => setToolChoice(event.target.value)}
                        >
                          <option value="auto">{t("legacy.text_c614ba7c453c")}</option>
                          <option value="none">{t("legacy.text_51e61d2d1bcc")}</option>
                          <option value="required">{t("legacy.text_f128ad0f3953")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2">
                      <div className="field">
                        <label>{t("legacy.text_230e01e5b387")}</label>
                        <input
                          className="input"
                          type="number"
                          min={-2}
                          max={2}
                          step={0.1}
                          value={frequencyPenalty}
                          onChange={(event) => setFrequencyPenalty(Number(event.target.value))}
                        />
                      </div>
                      <div className="field">
                        <label>{t("legacy.text_91357a379984")}</label>
                        <input
                          className="input"
                          type="number"
                          min={-2}
                          max={2}
                          step={0.1}
                          value={presencePenalty}
                          onChange={(event) => setPresencePenalty(Number(event.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {agentType === "github" && (
                  <div className="platform-section">
                    <div className="platform-section-title">
                      {t("agents.modal.github_section_title")}
                    </div>

                    <div className="field">
                      <label>{t("errors.fields.theme")}</label>
                      <input
                        className="input"
                        value={copilotTopic}
                        onChange={(event) => setCopilotTopic(event.target.value)}
                      />
                    </div>

                    <label className="toggle-label">
                      <input
                        type="checkbox"
                        checked={repoContext}
                        onChange={(event) => setRepoContext(event.target.checked)}
                      />
                      <span className="toggle-track" />
                      {t("agents.modal.github_repo_context")}
                    </label>
                  </div>
                )}

                {scope === "public" && (
                  <div className="platform-section">
                    <div className="platform-section-title">{t("legacy.text_5bd93d308a31")}</div>
                    <div className="form-row-2">
                      <div className="field">
                        <label>{t("errors.fields.category")}</label>
                        <input
                          className="input"
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>{t("legacy.text_26986847ac47")}</label>
                        <select
                          className="select"
                          value={trialMissingDeps}
                          onChange={(event) => setTrialMissingDeps(event.target.value)}
                        >
                          <option value="warn">{t("legacy.text_55daeedb3e02")}</option>
                          <option value="block">{t("legacy.text_98818d5d15a3")}</option>
                          <option value="ignore">{t("legacy.text_f19abc8c1761")}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="platform-section">
                  <div className="platform-section-title">{t("agents.modal.routines_title")}</div>

                  {routines.map((routine, index) => (
                    <div className="routine-card" key={index}>
                      <div className="form-row-2">
                        <div className="field">
                          <label>{t("agents.modal.field_name")}</label>
                          <input
                            className="input"
                            value={routine.name}
                            onChange={(event) =>
                              setRoutines((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, name: event.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                        <div className="field">
                          <label>{t("agents.modal.routine_trigger_label")}</label>
                          <select
                            className="select"
                            value={routine.trigger_type}
                            onChange={(event) =>
                              setRoutines((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? {
                                        ...item,
                                        trigger_type: event.target.value as Routine["trigger_type"],
                                      }
                                    : item,
                                ),
                              )
                            }
                          >
                            <option value="manual">
                              {t("agents.modal.routine_trigger_manual")}
                            </option>
                            <option value="scheduled">{t("legacy.text_9d4bd96f5f80")}</option>
                            <option value="webhook">
                              {t("agents.modal.routine_trigger_webhook")}
                            </option>
                          </select>
                        </div>
                      </div>

                      {routine.trigger_type === "scheduled" && (
                        <div className="field">
                          <label>{t("legacy.text_6147cd24e7f3")}</label>
                          <input
                            className="input"
                            value={routine.schedule ?? ""}
                            onChange={(event) =>
                              setRoutines((items) =>
                                items.map((item, itemIndex) =>
                                  itemIndex === index
                                    ? { ...item, schedule: event.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="0 9 * * 1-5"
                          />
                        </div>
                      )}

                      <div className="field">
                        <label>{t("legacy.text_a817d7eb8e0f")}</label>
                        <textarea
                          className="textarea"
                          value={routine.prompt}
                          onChange={(event) =>
                            setRoutines((items) =>
                              items.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, prompt: event.target.value }
                                  : item,
                              ),
                            )
                          }
                        />
                      </div>

                      <button
                        type="button"
                        className="btn-icon btn-icon--danger"
                        title={t("admin.delete_btn")}
                        aria-label={t("admin.delete_btn")}
                        onClick={() =>
                          setRoutines((items) =>
                            items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <DeleteActionIcon />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setRoutines((items) => [
                        ...items,
                        { name: "", trigger_type: "manual", prompt: "" },
                      ])
                    }
                  >
                    {t("legacy.text_bb3753f9e4b9")}
                  </button>
                </div>
              </>
            )}

            {save.isError && (
              <div className="form-error" role="alert">
                {t("legacy.text_37df319dac58")}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("agents.scan.folder_cancel_btn")}
            </button>

            <button className="btn btn-primary" disabled={save.isPending || !name.trim()}>
              {save.isPending ? t("common.actions.saving") : t("common.actions.save")}
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
  groups: Group[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
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
          <span className="modal-title">
            {t("legacy.text_e6153e8a4176")}
            {agent.name}
          </span>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="gsd-subtitle">{t("legacy.text_fd9225cddbfd")}</p>

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

                  {selected.includes(group.id) && (
                    <span className="gsd-badge">{t("teams.sharing.shared_badge")}</span>
                  )}
                </label>
              ))
            ) : (
              <p className="gsd-empty">{t("teams.sharing.no_groups")}</p>
            )}
          </div>

          {save.isError && <div className="form-error">{t("legacy.text_34e98c3bcf97")}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            {t("agents.scan.folder_cancel_btn")}
          </button>

          <button
            className="btn btn-primary"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {t("agents.modal.routine_save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ExportDialog({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const download = async (format: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/agents/${encodeURIComponent(agent.id)}/export/${format}`, {
        headers: { "Accept-Language": document.documentElement.lang || "es" },
      });
      if (!response.ok) throw new Error(i18n.t("common.errors.export_agent"));
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? `${agent.id}-${format}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setExported(format);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : i18n.t("dynamic.text_985728e75fd3"));
    }
  };
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">
            {t("common.actions.export")}
            {agent.name}
          </span>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <p className="input-hint">{t("legacy.text_f2186186c7d4")}</p>

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

                  <span className="export-opt-sub">{t("legacy.text_e5e86b4e81e5")}</span>
                </span>
              </button>
            ))}
          </div>

          {exported && (
            <div className="platform-section">
              <div className="platform-section-title">{t("landing.install.title")}</div>

              <p className="input-hint">{t("legacy.text_4bdd5f69cde6")}</p>

              <code className="export-install-path">
                {exported === "claude"
                  ? navigator.platform.toLowerCase().includes("win")
                    ? "%USERPROFILE%\\.claude\\agents\\"
                    : "~/.claude/agents/"
                  : exported === "github"
                    ? ".github/agents/"
                    : exported === "mcp"
                      ? "~/.config/iagentshub/mcp/"
                      : "OpenAI Dashboard → Assistants"}
              </code>
            </div>
          )}

          {error && <div className="form-error">{error}</div>}
        </div>
      </div>
    </div>
  );
}

export function AgentsPage() {
  const { t } = useTranslation();
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
    [builder, setBuilder] = useState(false),
    [chat, setChat] = useState<Agent | null>(null),
    [newMenu, setNewMenu] = useState(false),
    [catalog, setCatalog] = useState(false),
    [catalogSearch, setCatalogSearch] = useState(""),
    [exportAgent, setExportAgent] = useState<Agent | null>(null),
    [shareAgent, setShareAgent] = useState<Agent | null>(null),
    [importScan, setImportScan] = useState<ImportScan | null>(null),
    [importingScan, setImportingScan] = useState(false),
    [groupsOpen, setGroupsOpen] = useState(true),
    [activeGroup, setActiveGroup] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const directoryInput = useRef<HTMLInputElement>(null);
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
  const confirmDelete = (agent: Agent) => {
    if (
      window.confirm(
        i18n.t("dynamic.agents_delete_confirm", {
          name: agent.name ?? t("agents.card.fallback_name", { defaultValue: "Agent" }),
        }),
      )
    )
      remove.mutate(agent);
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
        setEditor(parseAgentFile(file.name, content));
      } catch {
        setEditor({ id: "", name: file.name.replace(/\.(md|json)$/i, ""), system_prompt: content });
      }
    });
  };
  const importDirectory = async (files: File[]) => {
    const candidates = files.filter((file) => /\.(md|json)$/i.test(file.name));
    const scan: ImportScan = { agents: [], skills: [], warnings: [] };
    for (const file of candidates) {
      const path = file.webkitRelativePath || file.name;
      try {
        const content = await file.text();
        if (/[\\/]\.claude[\\/]skills[\\/].+[\\/]skill\.md$/i.test(path)) {
          scan.skills.push(parseSkillFile(path, content));
        } else if (
          /\.(agent\.)?md$/i.test(path) ||
          /\.claude[\\/]agents[\\/].+\.(md|json)$/i.test(path) ||
          /\.github[\\/].+\.md$/i.test(path) ||
          path.toLowerCase().endsWith(".json")
        ) {
          scan.agents.push({ path, agent: parseAgentFile(path, content) });
        }
      } catch (cause) {
        scan.warnings.push(
          `${path}: ${cause instanceof Error ? cause.message : "formato no reconocido"}`,
        );
      }
    }
    if (!scan.agents.length && !scan.skills.length) {
      scan.warnings.push(t("agents.scan.empty"));
    }
    setImportScan(scan);
  };
  const performScanImport = async (agentIndexes?: number[]) => {
    if (!importScan) return;
    setImportingScan(true);
    try {
      const existingSkills = new Map(
        (query.data?.skills ?? [])
          .filter((skill) => Boolean(skill.name))
          .map((skill) => [(skill.name ?? "").toLowerCase(), skill.id]),
      );
      const importedSkillIds = new Map<string, string>();
      for (const skill of importScan.skills) {
        const known = existingSkills.get(skill.name.toLowerCase());
        if (known) {
          importedSkillIds.set(skill.name.toLowerCase(), known);
          continue;
        }
        const created = await api.post<{ id: string }>("/api/skills/private", {
          name: skill.name,
          description: skill.description,
          content: skill.content,
        });
        importedSkillIds.set(skill.name.toLowerCase(), created.id);
      }
      const selected = agentIndexes
        ? importScan.agents.filter((_, index) => agentIndexes.includes(index))
        : importScan.agents;
      for (const item of selected) {
        const requested = item.agent.skills ?? [];
        const linked = requested
          .map(
            (name) =>
              importedSkillIds.get(name.toLowerCase()) ?? existingSkills.get(name.toLowerCase()),
          )
          .filter((id): id is string => Boolean(id));
        await api.post("/api/agents", {
          ...item.agent,
          skills: linked.length ? linked : [...importedSkillIds.values()],
          scope: "private",
        });
      }
      await queryClient.invalidateQueries();
      setImportScan(null);
    } finally {
      setImportingScan(false);
    }
  };
  return (
    <main className="page-content agents-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("agents.page.title")}</h1>

          <p className="page-subtitle">{t("agents.page.subtitle")}</p>
        </div>

        <div className="page-actions" style={{ position: "relative" }}>
          <button
            id="btn-new-agent"
            type="button"
            className="btn btn-primary page-primary-action"
            onClick={() => setNewMenu((value) => !value)}
            aria-expanded={newMenu}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path
                d="M6.5 1v11M1 6.5h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            <span>{t("agents.page.new_btn")}</span>

            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              style={{ marginLeft: 2, opacity: 0.7 }}
              aria-hidden="true"
            >
              <path
                d="M2 3.5l3 3 3-3"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {newMenu && (
            <div
              className="action-menu"
              style={{ position: "absolute", right: 0, top: "calc(100% + 6px)" }}
            >
              <div className="am-opts">
                <button
                  className="am-opt"
                  onClick={() => {
                    setEditor(null);
                    setNewMenu(false);
                  }}
                >
                  <span className="am-opt-icon">＋</span>

                  <span className="am-opt-text">
                    <span className="am-opt-label">{t("legacy.text_e21848503d0b")}</span>

                    <span className="am-opt-sub">{t("legacy.text_a080202bf09a")}</span>
                  </span>
                </button>

                <button
                  className="am-opt"
                  onClick={() => {
                    setBuilder(true);
                    setNewMenu(false);
                  }}
                >
                  <span className="am-opt-icon">✦</span>

                  <span className="am-opt-text">
                    <span className="am-opt-label">{t("legacy.text_52d884f096f6")}</span>

                    <span className="am-opt-sub">{t("legacy.text_488b3416cb26")}</span>
                  </span>
                </button>

                <button
                  className="am-opt"
                  onClick={() => {
                    setCatalog(true);
                    setNewMenu(false);
                  }}
                >
                  <span className="am-opt-icon">▦</span>

                  <span className="am-opt-text">
                    <span className="am-opt-label">{t("legacy.text_cb212e7ec4bb")}</span>

                    <span className="am-opt-sub">{t("legacy.text_2319e2e2c580")}</span>
                  </span>
                </button>

                <button className="am-opt" onClick={() => fileInput.current?.click()}>
                  <span className="am-opt-icon">⇧</span>

                  <span className="am-opt-text">
                    <span className="am-opt-label">{t("legacy.text_ac099688dd4e")}</span>

                    <span className="am-opt-sub">{t("memory.page.new_from_file_sub")}</span>
                  </span>
                </button>

                <button className="am-opt" onClick={() => directoryInput.current?.click()}>
                  <span className="am-opt-icon">▤</span>

                  <span className="am-opt-text">
                    <span className="am-opt-label">{t("legacy.text_4daef95b72f9")}</span>

                    <span className="am-opt-sub">{t("legacy.text_f26a2ea8d3db")}</span>
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

          <input
            ref={directoryInput}
            type="file"
            hidden
            multiple
            {...({
              webkitdirectory: "",
              directory: "",
            } as React.InputHTMLAttributes<HTMLInputElement>)}
            onChange={(event) => {
              void importDirectory([...(event.currentTarget.files ?? [])]);
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
            placeholder={t("workflows.catalog.search")}
            aria-label={t("legacy.text_0f7a02f38c9d")}
          />

          {search && (
            <button
              className="fa-search-clear"
              onClick={() => setSearch("")}
              aria-label={t("common.search.clear_aria")}
            >
              ×
            </button>
          )}
        </div>

        <div className="fa-filter-group">
          <FilterDropdown
            label={t("agents.filter.skills_label")}
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
            label={t("agents.filter.connection_label")}
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
            label={t("agents.filter.knowledge_label")}
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
            label={t("agents.filter.memory_label")}
            count={memory ? 1 : 0}
            open={openFilter === "memory"}
            onToggle={() => setOpenFilter(openFilter === "memory" ? null : "memory")}
          >
            <FilterOption
              label={t("legacy.text_20db5f9f5f96")}
              active={memory === "yes"}
              onClick={() => setMemory(memory === "yes" ? "" : "yes")}
            />

            <FilterOption
              label={t("agents.filter.memory_none")}
              active={memory === "no"}
              onClick={() => setMemory(memory === "no" ? "" : "no")}
            />
          </FilterDropdown>

          <FilterDropdown
            label={t("agents.blueprint.status")}
            count={labels.length}
            open={openFilter === "labels"}
            onToggle={() => setOpenFilter(openFilter === "labels" ? null : "labels")}
          >
            {(
              [
                ["public", i18n.t("dynamic.text_ff2e5e62f8bf"), "#10b981"],
                ["production", i18n.t("dynamic.text_f88f7779e99a"), "#0891b2"],
                ["staging", "Staging", "#64748b"],
                ["development", "Desarrollo", "#f59e0b"],
                ["test", "Test", "#8b5cf6"],
                ["linked", "linked", "#94a3b8"],
                ["favorite", "Favorito", "#f59e0b"],
                ["draft", "Borrador", "#8b5cf6"],
                ["review", i18n.t("dynamic.text_efb87a29756b"), "#f97316"],
                ["deprecated", "Obsoleto", "#ca8a04"],
                ["quarantine", "Cuarentena", "#ef4444"],
                ["archived", "Archivado", "#94a3b8"],
                ["delete", t("common.actions.delete"), "#dc2626"],
              ] as const
            ).map(([label, text, color]) => (
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
              {t("admin.metadata.log_clear")}
            </button>
          )}
        </div>
      </div>

      <div className="af-wrapper">
        <div className="folder-toggle-row">
          <button
            className={`folder-toggle-btn${groupsOpen ? " folder-toggle-btn--on" : ""}`}
            title={t("landing.features.groups_title")}
            onClick={() => setGroupsOpen((value) => !value)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />

              <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />

              <path
                d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />

              <path
                d="M9 9.2A3.5 3.5 0 0 1 14.5 12.5V13"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="af-layout">
          {groupsOpen && (
            <aside className="af-groups-panel">
              <div className="kf-section-header">
                <span className="kf-section-label">{t("workflows.groups.title")}</span>

                <button className="kf-add-btn" title={t("legacy.text_646cd2c77fdb")}>
                  ＋
                </button>
              </div>

              <button
                className={`kf-item${activeGroup === null ? " kf-item--active" : ""}`}
                onClick={() => setActiveGroup(null)}
              >
                <span className="kf-item-name">{t("admin.logs.filter_all")}</span>
              </button>

              {query.data?.groups
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
                {t("legacy.text_40334dd4f386")}
              </div>
            )}

            {query.isPending ? (
              <div className="empty-state">{t("workflows.builder.loading_agents")}</div>
            ) : query.isError ? (
              <div className="empty-state">
                <p>{t("legacy.text_43d19a73da73")}</p>

                <button className="btn btn-primary" onClick={() => void query.refetch()}>
                  {t("legacy.text_adec7b4f2351")}
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
                  {active ? t("agents.filter.no_results") : i18n.t("dynamic.text_c07e60a6b47f")}
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

            {builder && query.data && (
              <AgentBuilderDialog
                connections={query.data.connections}
                skills={query.data.skills}
                knowledge={query.data.knowledge}
                onClose={() => setBuilder(false)}
                onSaved={() => {
                  setBuilder(false);
                  void query.refetch();
                }}
              />
            )}

            {chat && <ChatDialog agent={chat} onClose={() => setChat(null)} />}

            {catalog && (
              <div className="modal-bg" role="dialog" aria-modal="true">
                <div className="modal-box" style={{ width: 760 }}>
                  <div className="modal-header">
                    <span className="modal-title">{t("agents.catalog.title")}</span>

                    <button className="modal-close" onClick={() => setCatalog(false)}>
                      ×
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="ac-search-wrap">
                      <input
                        className="input"
                        placeholder={t("legacy.text_402c940f7485")}
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
                                {agent.description || i18n.t("dynamic.text_3f8d6232f5be")}
                              </div>
                            </div>

                            <div className="ac-card-footer">
                              <button
                                className="ac-template-btn"
                                onClick={() => {
                                  const template = { ...agent };
                                  Reflect.deleteProperty(template, "origin_type");
                                  setEditor({ ...template, id: "" });
                                  setCatalog(false);
                                }}
                              >
                                {t("legacy.text_990bc42bbecf")}
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

            {importScan && (
              <div
                className="modal-bg"
                role="dialog"
                aria-modal="true"
                aria-label={t("agents.preview.title")}
              >
                <div className="modal-box">
                  <div className="modal-header">
                    <div>
                      <h2 className="modal-title">{t("agents.preview.title")}</h2>

                      <p className="input-hint">
                        {importScan.agents.length} {t("legacy.text_3d66a7e72047")}
                        {importScan.skills.length} {t("legacy.text_816f2b87d3d3")}
                      </p>
                    </div>

                    <button className="modal-close" onClick={() => setImportScan(null)}>
                      ×
                    </button>
                  </div>

                  <div className="modal-body">
                    {importScan.warnings.length > 0 && (
                      <div className="form-error">
                        {importScan.warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    )}

                    {importScan.skills.length > 0 && (
                      <div className="platform-section">
                        <div className="platform-section-title">
                          {t("legacy.text_cde351cacf59")}
                        </div>

                        {importScan.skills.map((skill) => (
                          <span className="chip" key={skill.path}>
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="platform-section">
                      <div className="platform-section-title">{t("legacy.text_f0eb008582c4")}</div>

                      {importScan.agents.map((item, index) => (
                        <div className="scan-preview-row" key={item.path}>
                          <div>
                            <strong>{item.agent.name}</strong>
                            <div className="input-hint">{item.path}</div>
                          </div>

                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={importingScan}
                            onClick={() => void performScanImport([index])}
                          >
                            {t("agents.scan.import_btn")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button className="btn btn-ghost" onClick={() => setImportScan(null)}>
                      {t("agents.scan.folder_cancel_btn")}
                    </button>

                    <button
                      className="btn btn-primary"
                      disabled={
                        importingScan || (!importScan.agents.length && !importScan.skills.length)
                      }
                      onClick={() => void performScanImport()}
                    >
                      {importingScan ? "Importando…" : "Importar todo"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {shareAgent && query.data && (
              <ShareDialog
                agent={shareAgent}
                groups={query.data.groups.filter((group) => group.type === "team")}
                onClose={() => setShareAgent(null)}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
