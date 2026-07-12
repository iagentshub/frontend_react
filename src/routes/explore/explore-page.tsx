import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { sessionQuery } from "@/auth/queries";
import type {
  AgentTryResult,
  ConnectionOption,
  ExplorePreview,
  ExploreResource,
  ExploreType,
  ExploreUser,
  ResourceType,
  SocialActionResult,
} from "./types";
import "../../../assets/css/labels.css";
import "@/styles/routes/explore/explore.css";
import "./explore-page.css";

const avatarColors = [
  "#4f46e5",
  "#0891b2",
  "#059669",
  "#d97706",
  "#7c3aed",
  "#db2777",
  "#0f766e",
] as const;
const labelColors: Record<string, string> = {
  public: "#059669",
  private: "#64748b",
  production: "#0891b2",
  staging: "#475569",
  development: "#d97706",
  test: "#7c3aed",
  favorite: "#f59e0b",
  draft: "#8b5cf6",
  review: "#f97316",
  deprecated: "#ca8a04",
  quarantine: "#ef4444",
  archived: "#94a3b8",
  delete: "#dc2626",
};
const resourceLabels: Record<ResourceType, string> = {
  agent: "Agente",
  skill: "Skill",
  knowledge: "Knowledge",
};

function avatarColor(value: string) {
  const sum = [...value].reduce((total, character) => total + character.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length] ?? avatarColors[0];
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="2.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3" cy="13.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="13" cy="13.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 4.2v3.5m0 0L3 11.8m5-4.1 5 4.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5L7 4M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5L9 12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LabelChips({ labels }: { labels: string[] | undefined }) {
  const { t } = useTranslation();
  const visible = (labels ?? []).filter((label) => label !== "private" && labelColors[label]);
  if (!visible.length) return null;
  return (
    <div className="label-chips-row" style={{ marginTop: 4 }}>
      {visible.map((label) => (
        <span
          className="label-chip"
          style={{ "--lc": labelColors[label] } as React.CSSProperties}
          key={label}
        >
          {t(`labels.${label}`)}
        </span>
      ))}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div
      className="modal-bg"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-box ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserCard({
  user,
  compact,
  canInvite,
  onInvite,
}: {
  user: ExploreUser;
  compact: boolean;
  canInvite: boolean;
  onInvite: (username: string) => void;
}) {
  const { t } = useTranslation();
  const avatar = (
    <>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" />
      ) : (
        user.username.charAt(0).toUpperCase()
      )}
    </>
  );
  if (!compact) {
    return (
      <article className="explore-card" data-type="user">
        <div className="explore-card-top">
          <div className="explore-card-avatar" style={{ background: avatarColor(user.username) }}>
            {avatar}
          </div>
          <div className="explore-card-info">
            <div className="explore-card-name">@{user.username}</div>
            <div className="explore-card-meta">
              <span className="explore-card-type-badge">Usuario</span>
            </div>
          </div>
        </div>
        <p className="explore-card-desc">
          <strong>{user.followers_count ?? 0}</strong> {t("social.follow.followers")} ·{" "}
          <strong>{user.public_resources_count ?? 0}</strong> {t("explore.users.resources")}
        </p>
        <div className="explore-card-footer">
          <div className="explore-card-actions">
            <Link to={`/u/${encodeURIComponent(user.username)}`} className="btn btn-ghost btn-sm">
              {t("explore.users.view_profile")}
            </Link>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="explore-user-card">
      <Link
        to={`/u/${encodeURIComponent(user.username)}`}
        className="explore-user-avatar"
        style={{ background: avatarColor(user.username) }}
      >
        {avatar}
      </Link>
      <div className="explore-user-info">
        <Link to={`/u/${encodeURIComponent(user.username)}`} className="explore-user-name">
          @{user.username}
        </Link>
        <span className="explore-user-meta">
          <strong>{user.followers_count ?? 0}</strong> {t("social.follow.followers")} ·{" "}
          <strong>{user.public_resources_count ?? 0}</strong> {t("explore.users.resources")}
        </span>
      </div>
      <div className="explore-user-actions">
        <Link to={`/u/${encodeURIComponent(user.username)}`} className="btn btn-ghost btn-sm">
          {t("explore.users.view_profile")}
        </Link>
        {canInvite && (
          <button className="btn btn-ghost btn-sm" onClick={() => onInvite(user.username)}>
            {t("explore.users.invite")}
          </button>
        )}
      </div>
    </article>
  );
}

function PreviewContent({ preview }: { preview: ExplorePreview }) {
  const temperature = typeof preview.temperature === "number" ? preview.temperature : 0.7;
  if (preview.resource_type === "agent") {
    return (
      <>
        <div className="abp-header">
          <div
            className="agent-avatar"
            style={{
              background: avatarColor(preview.name),
              width: 38,
              height: 38,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            {preview.name.charAt(0).toUpperCase()}
          </div>
          <div className="abp-agent-meta">
            <div className="abp-agent-name">{preview.name}</div>
            {preview.description && <div className="abp-agent-desc">{preview.description}</div>}
            <div className="abp-agent-badges">
              {preview.category && (
                <span className="explore-card-type-badge">{preview.category}</span>
              )}
              <LabelChips labels={preview.labels} />
            </div>
          </div>
        </div>
        <div className="abp-grid-2">
          <PreviewList title="Skills" values={preview.skills} />
          <PreviewList title="Conocimiento" values={preview.knowledge} />
          <div className="abp-section">
            <div className="abp-section-label">Config</div>
            <div className="abp-cfg-row">
              <span className="abp-cfg-key">Temperatura</span>
              <span className="abp-temp-bar">
                <span className="abp-temp-track">
                  <span
                    className="abp-temp-fill"
                    style={{ width: `${Math.round(temperature * 100)}%` }}
                  />
                </span>
                <span className="abp-cfg-val">{temperature.toFixed(1)}</span>
              </span>
            </div>
            {preview.use_memory && (
              <div className="abp-cfg-row">
                <span className="abp-cfg-key">Memoria</span>
                <span className="abp-cfg-val abp-cfg-val--on">On</span>
              </div>
            )}
          </div>
        </div>
        {preview.system_prompt && (
          <div className="abp-section abp-section--full">
            <div className="abp-section-label">Prompt de sistema</div>
            <pre className="abp-prompt-pre">{preview.system_prompt}</pre>
          </div>
        )}
      </>
    );
  }
  if (preview.resource_type === "skill") {
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="explore-card-type-badge">Skill</span>
          {preview.category && (
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{preview.category}</span>
          )}
          <LabelChips labels={preview.labels} />
        </div>
        {preview.description && (
          <p style={{ fontSize: 13, color: "var(--ink-2)", margin: 0 }}>{preview.description}</p>
        )}
        {preview.parameters?.length ? (
          <div className="abp-section">
            <div className="abp-section-label">Parámetros</div>
            {preview.parameters.map((parameter, index) => {
              const name = typeof parameter === "string" ? parameter : (parameter.name ?? "");
              const description =
                typeof parameter === "string" ? "" : (parameter.description ?? "");
              return (
                <div className="abp-item" key={`${name}-${index}`}>
                  <span className="abp-item-bullet" />
                  <code>{name}</code>
                  {description && <span>{description}</span>}
                </div>
              );
            })}
          </div>
        ) : null}
        {preview.body && (
          <div className="abp-section">
            <div className="abp-section-label">Instrucciones</div>
            <pre className="abp-prompt-pre" style={{ maxHeight: 280 }}>
              {preview.body}
            </pre>
          </div>
        )}
      </>
    );
  }
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className="explore-card-type-badge">Knowledge</span>
        <LabelChips labels={preview.labels} />
      </div>
      {preview.source && (
        <div className="abp-section" style={{ minHeight: 0 }}>
          <div className="abp-section-label">Fuente</div>
          <span>{preview.source}</span>
          {Boolean(preview.char_count) && <span>{formatChars(preview.char_count ?? 0)} chars</span>}
        </div>
      )}
      {preview.content && (
        <div className="abp-section">
          <div className="abp-section-label">Contenido</div>
          <pre className="abp-prompt-pre" style={{ maxHeight: 300 }}>
            {preview.content}
          </pre>
        </div>
      )}
    </>
  );
}

function PreviewList({ title, values }: { title: string; values: string[] | undefined }) {
  return (
    <div className="abp-section">
      <div className="abp-section-label">{title}</div>
      {values?.length ? (
        values.map((value) => (
          <div className="abp-item" key={value}>
            <span className="abp-item-bullet" />
            <span>{value}</span>
          </div>
        ))
      ) : (
        <span className="abp-empty">—</span>
      )}
    </div>
  );
}

function formatChars(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

interface ResourceCardProps {
  resource: ExploreResource;
  ownUsername: string;
  starred: boolean;
  forked: boolean;
  linked: boolean;
  busyAction: string | undefined;
  onPreview: (resource: ExploreResource) => void;
  onAction: (action: "star" | "fork" | "link", resource: ExploreResource) => void;
  onTry: (resource: ExploreResource) => void;
}

function ResourceCard({
  resource,
  ownUsername,
  starred,
  forked,
  linked,
  busyAction,
  onPreview,
  onAction,
  onTry,
}: ResourceCardProps) {
  const { t } = useTranslation();
  const isOwn = Boolean(ownUsername) && resource.owner === ownUsername;
  const forkable = !isOwn;
  const busy = Boolean(busyAction);
  return (
    <article className="explore-card">
      <div className="explore-card-top">
        <div className="explore-card-avatar" style={{ background: avatarColor(resource.name) }}>
          {resource.name.charAt(0).toUpperCase()}
        </div>
        <div className="explore-card-info">
          <div className="explore-card-name" title={resource.name}>
            {resource.name}
          </div>
          <div className="explore-card-meta">
            <span className="explore-card-type-badge">
              {resourceLabels[resource.resource_type]}
            </span>
            {resource.category}
            {resource.fork_of_id && (
              <span className="explore-card-fork-badge">{t("labels.fork")}</span>
            )}
            {resource.linked_to_id && (
              <span className="explore-card-fork-badge">{t("labels.linked")}</span>
            )}
            {resource.verified && <span className="explore-card-verified-badge">✓ Verificado</span>}
          </div>
        </div>
        <Link
          to={`/u/${encodeURIComponent(resource.owner)}`}
          className="explore-card-owner-avatar"
          style={{ background: avatarColor(resource.owner) }}
          title={`@${resource.owner}`}
        >
          {resource.owner.charAt(0).toUpperCase()}
        </Link>
      </div>
      <p className="explore-card-desc">{resource.description ?? ""}</p>
      <LabelChips labels={resource.labels} />
      <div className="explore-card-footer">
        <div className={`explore-card-actions${busy ? " explore-card-action-busy" : ""}`}>
          <button
            className="explore-card-eye-btn"
            onClick={() => onPreview(resource)}
            title="Vista previa"
            aria-label={`Vista previa de ${resource.name}`}
          >
            <EyeIcon />
          </button>
          {forkable && (
            <>
              <button
                disabled={forked || busy}
                className={`explore-card-fork-btn${forked ? " forked" : ""}`}
                onClick={() => onAction("fork", resource)}
                title={t("labels.actions.fork")}
                aria-label={`${t("labels.actions.fork")} ${resource.name}`}
              >
                <ForkIcon />
              </button>
              <button
                disabled={linked || busy}
                className={`explore-card-fork-btn${linked ? " forked" : ""}`}
                onClick={() => onAction("link", resource)}
                title={t("labels.actions.link")}
                aria-label={`${t("labels.actions.link")} ${resource.name}`}
              >
                <LinkIcon />
              </button>
            </>
          )}
          {!isOwn && resource.resource_type === "agent" && (
            <button className="explore-card-try-btn" onClick={() => onTry(resource)}>
              Probar
            </button>
          )}
          <button
            className={`explore-card-star-btn${starred ? " starred" : ""}`}
            disabled={busy}
            onClick={() => onAction("star", resource)}
            aria-label={`Estrella ${resource.name}`}
          >
            ★ <span className="star-count">{resource.stars_count ?? 0}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

export function ExplorePage() {
  const { t } = useTranslation();
  const { data: session } = useQuery(sessionQuery);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<ExploreType>("all");
  const [searched, setSearched] = useState(false);
  const [resources, setResources] = useState<ExploreResource[]>([]);
  const [users, setUsers] = useState<ExploreUser[]>([]);
  const [resourceOffset, setResourceOffset] = useState(0);
  const [userOffset, setUserOffset] = useState(0);
  const [hasMoreResources, setHasMoreResources] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [preview, setPreview] = useState<ExplorePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [tryResource, setTryResource] = useState<ExploreResource | null>(null);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [forked, setForked] = useState<Record<string, boolean>>({});
  const [linked, setLinked] = useState<Record<string, boolean>>({});
  const [busyKey, setBusyKey] = useState("");
  const workspaceId =
    typeof session?.workspace_id === "string" ? session.workspace_id : (session?.username ?? "");

  const searchMutation = useMutation({
    mutationFn: async ({
      append,
      searchType,
      searchQuery,
    }: {
      append: boolean;
      searchType: ExploreType;
      searchQuery: string;
    }) => {
      const resourceStart = append ? resourceOffset : 0;
      const userStart = append ? userOffset : 0;
      const encodedQuery = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : "";
      const wantsResources = searchType !== "users";
      const wantsUsers = searchType === "users" || searchType === "all";
      const resourceType =
        searchType !== "all" && searchType !== "users" ? `&type=${searchType}` : "";
      const [resourceData, userData] = await Promise.all([
        wantsResources
          ? api.get<ExploreResource[]>(
              `/api/explore?limit=41&offset=${resourceStart}${resourceType}${encodedQuery}`,
            )
          : Promise.resolve([]),
        wantsUsers
          ? api.get<ExploreUser[]>(`/api/users?limit=21&offset=${userStart}${encodedQuery}`)
          : Promise.resolve([]),
      ]);
      return { resourceData, userData, append, wantsResources, wantsUsers };
    },
    onSuccess: ({ resourceData, userData, append, wantsResources, wantsUsers }) => {
      const nextResources = resourceData.slice(0, 40);
      const nextUsers = userData.slice(0, 20);
      setResources((current) => (append ? [...current, ...nextResources] : nextResources));
      setUsers((current) => (append ? [...current, ...nextUsers] : nextUsers));
      setResourceOffset((current) =>
        append ? current + nextResources.length : nextResources.length,
      );
      setUserOffset((current) => (append ? current + nextUsers.length : nextUsers.length));
      setHasMoreResources(wantsResources && resourceData.length > 40);
      setHasMoreUsers(wantsUsers && userData.length > 20);
    },
    onError: (error) => {
      setStatus(error instanceof Error ? error.message : "No se pudo realizar la búsqueda");
      setStatusError(true);
    },
  });

  const executeSearch = (append = false, searchType: ExploreType = type) => {
    setSearched(true);
    setStatus("");
    setStatusError(false);
    searchMutation.mutate({ append, searchType, searchQuery: query });
  };

  const socialAction = async (action: "star" | "fork" | "link", resource: ExploreResource) => {
    const key = `${resource.resource_type}:${resource.resource_id}`;
    setBusyKey(`${key}:${action}`);
    setStatus("");
    try {
      if (action === "star") {
        const active = Boolean(starred[key]);
        const result = active
          ? await api.delete<SocialActionResult>(
              `/api/${resource.resource_type}/${encodeURIComponent(resource.resource_id)}/star`,
            )
          : await api.post<SocialActionResult>(
              `/api/${resource.resource_type}/${encodeURIComponent(resource.resource_id)}/star`,
              {},
            );
        setStarred((current) => ({ ...current, [key]: !active }));
        setResources((current) =>
          current.map((item) =>
            item.resource_id === resource.resource_id &&
            item.resource_type === resource.resource_type
              ? { ...item, stars_count: result.stars ?? 0 }
              : item,
          ),
        );
      } else {
        const prefix =
          resource.resource_type === "knowledge"
            ? "/api/knowledge"
            : `/api/${resource.resource_type === "skill" ? "skills" : "agents"}/public`;
        const result = await api.post<SocialActionResult>(
          `${prefix}/${encodeURIComponent(resource.resource_id)}/${action}`,
          {},
        );
        if (action === "fork") setForked((current) => ({ ...current, [key]: true }));
        else setLinked((current) => ({ ...current, [key]: true }));
        setStatus(
          `${action === "fork" ? t("labels.actions.fork_success") : t("labels.actions.link_success")}${result.name ? `: ${result.name}` : ""}`,
        );
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo completar la acción");
      setStatusError(true);
    } finally {
      setBusyKey("");
    }
  };

  const openPreview = async (resource: ExploreResource) => {
    setPreviewLoading(true);
    try {
      setPreview(
        await api.get<ExplorePreview>(
          `/api/explore/${resource.resource_type}/${encodeURIComponent(resource.resource_id)}/preview`,
        ),
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo cargar la vista previa");
      setStatusError(true);
    } finally {
      setPreviewLoading(false);
    }
  };

  const invite = async (username: string) => {
    if (!workspaceId) {
      setStatus(t("explore.users.invite_no_ws"));
      setStatusError(true);
      return;
    }
    setBusyKey(`invite:${username}`);
    try {
      await api.post(`/api/workspaces/${encodeURIComponent(workspaceId)}/invitations`, {
        username,
      });
      setStatus(`${t("explore.users.invite_sent")} @${username}`);
      setStatusError(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("explore.users.invite_error"));
      setStatusError(true);
    } finally {
      setBusyKey("");
    }
  };

  const visibleCount = resources.length + users.length;
  const prompt = !searched
    ? t("explore.prompt")
    : !searchMutation.isPending && visibleCount === 0
      ? t("explore.empty")
      : "";
  const hasMore = hasMoreResources || hasMoreUsers;

  return (
    <main className="page-content explore-page">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">{t("explore.title")}</h1>
          <p className="page-subtitle">{t("explore.subtitle")}</p>
        </div>
      </div>
      <form
        className="explore-filters"
        onSubmit={(event) => {
          event.preventDefault();
          executeSearch();
        }}
      >
        <div className="explore-search-wrap">
          <svg
            className="explore-search-icon"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="m10 10 3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            className="explore-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("explore.search_placeholder")}
          />
        </div>
        <select
          id="explore-type"
          className="select explore-type-select"
          value={type}
          onChange={(event) => {
            const next = event.target.value as ExploreType;
            setType(next);
            if (searched) executeSearch(false, next);
          }}
        >
          <option value="all">{t("explore.type_all")}</option>
          <option value="agent">{t("explore.type_agents")}</option>
          <option value="skill">{t("explore.type_skills")}</option>
          <option value="knowledge">{t("explore.type_knowledge")}</option>
          <option value="users">{t("explore.type_users")}</option>
        </select>
        <button id="explore-search-btn" type="submit" className="btn btn-primary explore-search-btn" disabled={searchMutation.isPending}>
          {t("explore.btn_search")}
        </button>
      </form>
      <div
        className={`explore-inline-status${statusError ? " explore-inline-status--error" : ""}`}
        role="status"
      >
        {status}
      </div>
      {searchMutation.isPending && !visibleCount ? (
        <div className="explore-loading">
          <div className="spinner" />
        </div>
      ) : prompt ? (
        <div className="explore-empty">
          <p>{prompt}</p>
        </div>
      ) : (
        <div className="explore-grid">
          {resources.map((resource) => {
            const key = `${resource.resource_type}:${resource.resource_id}`;
            return (
              <ResourceCard
                key={key}
                resource={resource}
                ownUsername={session?.username ?? ""}
                starred={Boolean(starred[key])}
                forked={Boolean(forked[key])}
                linked={Boolean(linked[key])}
                busyAction={busyKey.startsWith(`${key}:`) ? busyKey : undefined}
                onPreview={(item) => void openPreview(item)}
                onAction={(action, item) => void socialAction(action, item)}
                onTry={setTryResource}
              />
            );
          })}
          {users.map((user) => (
            <UserCard
              key={user.username}
              user={user}
              compact={type === "users"}
              canInvite={
                user.username !== session?.username && busyKey !== `invite:${user.username}`
              }
              onInvite={(username) => void invite(username)}
            />
          ))}
        </div>
      )}
      {searched && hasMore && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <button
            className="btn btn-ghost"
            disabled={searchMutation.isPending}
            onClick={() => executeSearch(true)}
          >
            {searchMutation.isPending ? "…" : t("explore.load_more")}
          </button>
        </div>
      )}
      {previewLoading && (
        <div className="explore-loading" aria-label="Cargando vista previa">
          <div className="spinner" />
        </div>
      )}
      {preview && (
        <Modal title={preview.name} className="ep-box" onClose={() => setPreview(null)}>
          <div className="modal-body explore-modal-body">
            <PreviewContent preview={preview} />
          </div>
        </Modal>
      )}
      {tryResource && <TryAgentModal resource={tryResource} onClose={() => setTryResource(null)} />}
    </main>
  );
}

function TryAgentModal({ resource, onClose }: { resource: ExploreResource; onClose: () => void }) {
  const [connectionId, setConnectionId] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<AgentTryResult | null>(null);
  const connections = useQuery({
    queryKey: ["explore", "connections"],
    queryFn: ({ signal }) => api.get<ConnectionOption[]>("/api/connections", signal),
  });
  const available = useMemo(() => connections.data ?? [], [connections.data]);
  const effectiveConnectionId = connectionId || available[0]?.id || "";
  const send = useMutation({
    mutationFn: () =>
      api.post<AgentTryResult>(
        `/api/agents/public/${encodeURIComponent(resource.resource_id)}/try`,
        { connection_id: effectiveConnectionId, message: message.trim() },
      ),
    onSuccess: setResult,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (effectiveConnectionId && message.trim()) send.mutate();
  };
  return (
    <Modal title={`Probar agente de @${resource.owner}`} onClose={onClose}>
      <form className="modal-body explore-try-form" onSubmit={submit}>
        <div className="explore-try-field">
          <label htmlFor="explore-try-connection">Conexión</label>
          <select
            id="explore-try-connection"
            value={effectiveConnectionId}
            onChange={(event) => setConnectionId(event.target.value)}
            disabled={connections.isPending}
          >
            <option value="">
              {connections.isPending
                ? "Cargando…"
                : available.length
                  ? "Selecciona…"
                  : "Sin conexiones disponibles"}
            </option>
            {available.map((connection) => (
              <option value={connection.id} key={connection.id}>
                {connection.name ?? connection.id}
              </option>
            ))}
          </select>
        </div>
        <div className="explore-try-field">
          <label htmlFor="explore-try-message">Mensaje</label>
          <textarea
            id="explore-try-message"
            rows={3}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Escribe tu mensaje…"
          />
        </div>
        {result?.warnings?.length ? (
          <div className="explore-try-warning">
            <strong>Skills no disponibles:</strong> {result.warnings.join(", ")}
          </div>
        ) : null}
        {result && <div className="explore-try-result">{result.reply || "(sin respuesta)"}</div>}
        {send.isError && (
          <div className="form-error" role="alert">
            {send.error.message}
          </div>
        )}
        <button
          className="btn btn-primary"
          disabled={send.isPending || !effectiveConnectionId || !message.trim()}
          style={{ alignSelf: "flex-end" }}
        >
          {send.isPending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </Modal>
  );
}

