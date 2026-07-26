import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import {
  BlockActionIcon,
  DeleteActionIcon,
  EditActionIcon,
  UnblockActionIcon,
} from "@/components/resource-icons";
import type {
  AdminAgent,
  AdminConnection,
  AdminKnowledge,
  AdminUser,
  AdminWorkflow,
  AdminWorkspace,
} from "./types";

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : i18n.t("common.errors.operation");
}
function isTrue(value: boolean | number) {
  return value !== false && value !== 0;
}
function fmt(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);
}
function date(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf())
    ? "—"
    : parsed.toLocaleDateString(i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES");
}

export function AdminUsersPanel({
  users,
  allowCreate,
  onReload,
}: {
  users: AdminUser[];
  allowCreate: boolean;
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [verified, setVerified] = useState("");
  const [editor, setEditor] = useState<
    { mode: "create"; user?: never } | { mode: "edit"; user: AdminUser } | null
  >(null);
  const action = useMutation({
    mutationFn: async (
      task:
        | { kind: "active"; user: AdminUser }
        | { kind: "admin"; user: AdminUser }
        | { kind: "delete"; user: AdminUser },
    ) => {
      const url = `/api/admin/users/${encodeURIComponent(task.user.username)}`;
      if (task.kind === "delete") return api.delete(url);
      if (task.kind === "admin") return api.patch(url, { role: "admin" });
      return api.patch(url, { is_active: !isTrue(task.user.is_active) });
    },
    onSuccess: onReload,
  });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter(
        (user) =>
          (!q || `${user.email ?? ""} ${user.username}`.toLowerCase().includes(q)) &&
          (!role || user.role === role) &&
          (!active || isTrue(user.is_active) === (active === "true")) &&
          (!verified || isTrue(user.is_verified) === (verified === "true")),
      )
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
  }, [users, search, role, active, verified]);
  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-search-wrap">
          <span className="search-icon">⌕</span>
          <input
            className="admin-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("legacy.text_4aab7247777a")}
          />
        </div>
        <select
          className="admin-select"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">{t("legacy.text_3a115d121da1")}</option>
          <option value="admin">{t("admin.roles.admin")}</option>
          <option value="gestor">{t("teams.manager_badge")}</option>
          <option value="standard">{t("admin.roles.standard")}</option>
        </select>
        <select
          className="admin-select"
          value={active}
          onChange={(event) => setActive(event.target.value)}
        >
          <option value="">{t("legacy.text_09907040ab91")}</option>
          <option value="true">{t("legacy.text_5203471a090d")}</option>
          <option value="false">{t("legacy.text_2d06484b33d9")}</option>
        </select>
        <select
          className="admin-select"
          value={verified}
          onChange={(event) => setVerified(event.target.value)}
        >
          <option value="">{t("legacy.text_0780e1ebb44d")}</option>
          <option value="true">{t("legacy.text_a7344073f281")}</option>
          <option value="false">{t("legacy.text_c428509d78d5")}</option>
        </select>
        {allowCreate && (
          <button
            className="btn btn-primary btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={() => setEditor({ mode: "create" })}
          >
            {t("legacy.text_41fdb9e3ef15")}
          </button>
        )}
      </div>

      {action.error && <p className="form-error">{errorText(action.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("admin.table.email")}</th>
              <th>{t("admin.table.role")}</th>
              <th>{t("agents.blueprint.status")}</th>
              <th>{t("legacy.text_28bd2a42afd7")}</th>
              <th>{t("legacy.text_c38c6c1f3a27")}</th>
              <th>{t("teams.table.col_date")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.username}>
                <td>
                  <div className="user-avatar-cell">
                    <span className="user-avatar-sm">
                      {(user.email || user.username).charAt(0).toUpperCase()}
                    </span>
                    <span>{user.email || user.username}</span>
                  </div>
                </td>
                <td>
                  <span
                    className={`badge ${user.role === "admin" ? "badge--admin" : "badge--std"}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${isTrue(user.is_active) ? "badge--ok" : "badge--danger"}`}
                  >
                    {isTrue(user.is_active) ? t("admin.status.active") : t("admin.status.blocked")}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${isTrue(user.is_verified) ? "badge--ok" : "badge--warn"}`}
                  >
                    {t(
                      isTrue(user.is_verified)
                        ? "admin.user_editor.verified"
                        : "admin.user_editor.unverified",
                    )}
                  </span>
                </td>
                <td className="td-tokens">{fmt((user.tokens_in ?? 0) + (user.tokens_out ?? 0))}</td>
                <td className="td-date">{date(user.created_at)}</td>
                <td className="td-actions">
                  <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button
                      className="btn-icon"
                      title={t("admin.actions.edit")}
                      aria-label={t("admin.actions.edit")}
                      onClick={() => setEditor({ mode: "edit", user })}
                    >
                      <EditActionIcon />
                    </button>
                    <button
                      className="btn-icon"
                      title={
                        isTrue(user.is_active)
                          ? t("admin.actions.block")
                          : t("admin.actions.activate")
                      }
                      aria-label={
                        isTrue(user.is_active)
                          ? t("admin.actions.block")
                          : t("admin.actions.activate")
                      }
                      disabled={action.isPending}
                      onClick={() => action.mutate({ kind: "active", user })}
                    >
                      {isTrue(user.is_active) ? <BlockActionIcon /> : <UnblockActionIcon />}
                    </button>
                    {user.role !== "admin" && (
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={action.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              i18n.t("dynamic.admin_promote_confirm", {
                                username: user.username,
                              }),
                            )
                          )
                            action.mutate({ kind: "admin", user });
                        }}
                      >
                        {t("legacy.text_a050daf7a7d6")}
                      </button>
                    )}
                    <button
                      className="btn-icon btn-icon--danger"
                      title={t("admin.delete_btn")}
                      aria-label={t("admin.delete_btn")}
                      disabled={action.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            i18n.t("dynamic.admin_delete_user_confirm", {
                              username: user.username,
                            }),
                          )
                        )
                          action.mutate({ kind: "delete", user });
                      }}
                    >
                      <DeleteActionIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("legacy.text_298411d99038")}</div>
      )}

      {editor && (
        <UserEditor
          state={editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            onReload();
          }}
        />
      )}
    </>
  );
}

function UserEditor({
  state,
  onClose,
  onSaved,
}: {
  state: { mode: "create"; user?: never } | { mode: "edit"; user: AdminUser };
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(
    state.mode === "edit" ? (state.user.email ?? state.user.username) : "",
  );
  const [displayName, setDisplayName] = useState(
    state.mode === "edit" ? (state.user.display_name ?? "") : "",
  );
  const [role, setRole] = useState(state.mode === "edit" ? state.user.role : "standard");
  const [active, setActive] = useState(state.mode === "edit" ? isTrue(state.user.is_active) : true);
  const [password, setPassword] = useState("");
  const save = useMutation({
    mutationFn: () =>
      state.mode === "create"
        ? api.post("/api/admin/users", {
            email: email.trim(),
            display_name: displayName.trim() || undefined,
            role,
            password,
          })
        : api.patch(`/api/admin/users/${encodeURIComponent(state.user.username)}`, {
            role,
            is_active: active,
            ...(password ? { password } : {}),
          }),
    onSuccess: onSaved,
  });
  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {t(state.mode === "create" ? "admin.user_editor.new" : "admin.user_editor.edit")}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (email.trim() && (state.mode === "edit" || password.length >= 8)) save.mutate();
          }}
        >
          <div className="modal-body">
            <div className="field">
              <label>{t("admin.table.email")}</label>
              <input
                className="input"
                type="email"
                required
                disabled={state.mode === "edit"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            {state.mode === "create" && (
              <div className="field">
                <label>{t("legacy.text_4cb44539d0b7")}</label>
                <input
                  className="input"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            )}
            <div className="field">
              <label>{t("admin.table.role")}</label>
              <select
                className="select"
                value={role}
                onChange={(event) => setRole(event.target.value)}
              >
                <option value="standard">{t("admin.roles.standard")}</option>
                <option value="gestor">{t("teams.manager_badge")}</option>
                <option value="admin">{t("profile.roles.admin")}</option>
              </select>
            </div>
            {state.mode === "edit" && (
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />
                <span className="toggle-track" />
                <span className="toggle-label">{t("legacy.text_10140fb91e52")}</span>
              </label>
            )}
            <div className="field">
              <label>
                {state.mode === "create"
                  ? i18n.t("dynamic.text_5a6d1c612954")
                  : i18n.t("dynamic.text_d94fa1ff75ff")}
              </label>
              <input
                className="input"
                type="password"
                minLength={8}
                required={state.mode === "create"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {save.error && <p className="form-error">{errorText(save.error)}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("agents.scan.folder_cancel_btn")}
            </button>
            <button className="btn btn-primary" disabled={save.isPending}>
              {save.isPending
                ? t("common.actions.saving")
                : state.mode === "create"
                  ? t("admin.user_editor.create")
                  : t("common.actions.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminWorkspacesPanel({
  workspaces,
  onReload,
}: {
  workspaces: AdminWorkspace[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const action = useMutation({
    mutationFn: ({ workspace, kind }: { workspace: AdminWorkspace; kind: "status" | "delete" }) =>
      kind === "delete"
        ? api.delete(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}`)
        : api.post(`/api/admin/workspaces/${encodeURIComponent(workspace.id)}/status`, {
            status: workspace.status === "disabled" ? "active" : "disabled",
          }),
    onSuccess: onReload,
  });
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workspaces.filter(
      (workspace) => !q || `${workspace.name} ${workspace.created_by}`.toLowerCase().includes(q),
    );
  }, [search, workspaces]);
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("legacy.text_2205e0c6ca0d")}
        />
      </div>
      {action.error && <p className="form-error">{errorText(action.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("agents.modal.field_name")}</th>
              <th>{t("teams.table.col_creator")}</th>
              <th>{t("teams.card.members")}</th>
              <th>{t("agents.page.title")}</th>
              <th>{t("agents.modal.tab_connections")}</th>
              <th>{t("agents.filter.knowledge_label")}</th>
              <th>{t("legacy.text_c38c6c1f3a27")}</th>
              <th>{t("agents.blueprint.status")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((workspace) => (
              <tr key={workspace.id}>
                <td>
                  <span className="conn-name">{workspace.name}</span>
                </td>
                <td className="td-owner">{workspace.created_by}</td>
                <td>{workspace.member_count ?? 0}</td>
                <td>{workspace.agents_count ?? 0}</td>
                <td>{workspace.connections_count ?? 0}</td>
                <td>{workspace.knowledge_count ?? 0}</td>
                <td className="td-tokens">
                  {fmt((workspace.tokens_in ?? 0) + (workspace.tokens_out ?? 0))}
                </td>
                <td>
                  <span
                    className={`badge ${workspace.status === "disabled" ? "badge--danger" : "badge--ok"}`}
                  >
                    {workspace.status === "disabled" ? t("admin.status.disabled") : t("admin.status.active")}
                  </span>
                </td>
                <td className="td-actions">
                  <button
                    className="btn-icon"
                    title={
                      workspace.status === "disabled"
                        ? t("admin.actions.activate")
                        : t("admin.actions.deactivate")
                    }
                    aria-label={
                      workspace.status === "disabled"
                        ? t("admin.actions.activate")
                        : t("admin.actions.deactivate")
                    }
                    disabled={action.isPending}
                    onClick={() => action.mutate({ workspace, kind: "status" })}
                  >
                    {workspace.status === "disabled" ? <UnblockActionIcon /> : <BlockActionIcon />}
                  </button>
                  <button
                    className="btn-icon btn-icon--danger"
                    title={t("admin.delete_btn")}
                    aria-label={t("admin.delete_btn")}
                    disabled={action.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          i18n.t("dynamic.workspace_delete_confirm", {
                            name: workspace.name,
                          }),
                        )
                      )
                        action.mutate({ workspace, kind: "delete" });
                    }}
                  >
                    <DeleteActionIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("legacy.text_a2e4eae38020")}</div>
      )}
    </>
  );
}

export function AdminAgentsPanel({
  agents,
  onReload,
}: {
  agents: AdminAgent[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [editing, setEditing] = useState<AdminAgent | null>(null);
  const owners = useMemo(
    () =>
      [
        ...new Set(
          agents
            .map((agent) => agent.owner_email || agent.owner_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [agents],
  );
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agents.filter(
      (agent) =>
        (!q || `${agent.name ?? agent.id} ${agent.model ?? ""}`.toLowerCase().includes(q)) &&
        (!owner || (agent.owner_email || agent.owner_id) === owner),
    );
  }, [agents, search, owner]);
  const remove = useMutation({
    mutationFn: (agent: AdminAgent) =>
      api.delete(
        `/api/admin/agents/${encodeURIComponent(agent.id)}?scope=${encodeURIComponent(agent.scope ?? "private")}`,
      ),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("legacy.text_f7e4b0688da8")}
        />
        <select
          className="admin-select"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        >
          <option value="">{t("legacy.text_b7006384d86a")}</option>
          {owners.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {remove.error && <p className="form-error">{errorText(remove.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("docs.keywords.agent_title")}</th>
              <th>{t("agents.blueprint.type")}</th>
              <th>{t("agents.modal.tab_model")}</th>
              <th>{t("agents.origin.owner")}</th>
              <th>{t("agents.modal.field_visibility")}</th>
              <th>{t("legacy.text_c38c6c1f3a27")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((agent) => (
              <tr key={`${agent.scope}-${agent.id}`}>
                <td>
                  <span className="conn-name">{agent.name || agent.id}</span>
                </td>
                <td>
                  <span className="badge badge--type">{agent.agent_type || "generic"}</span>
                </td>
                <td>{agent.model || "—"}</td>
                <td className="td-owner">{agent.owner_email || agent.owner_id || "—"}</td>
                <td>
                  <span
                    className={`badge ${agent.scope === "public" ? "badge--ok" : "badge--std"}`}
                  >
                    {agent.scope || "private"}
                  </span>
                </td>
                <td className="td-tokens">
                  {fmt((agent.tokens_in ?? 0) + (agent.tokens_out ?? 0))}
                </td>
                <td className="td-actions">
                  <button
                    className="btn-icon"
                    title={t("admin.actions.edit")}
                    aria-label={t("admin.actions.edit")}
                    onClick={() => setEditing(agent)}
                  >
                    <EditActionIcon />
                  </button>
                  <button
                    className="btn-icon btn-icon--danger"
                    title={t("admin.delete_btn")}
                    aria-label={t("admin.delete_btn")}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (
                        confirm(
                          i18n.t("dynamic.admin_delete_agent_confirm", {
                            name: agent.name || agent.id,
                          }),
                        )
                      )
                        remove.mutate(agent);
                    }}
                  >
                    <DeleteActionIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("legacy.text_8dbeffe00a64")}</div>
      )}
      {editing && (
        <AgentEditor
          agent={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onReload();
          }}
        />
      )}
    </>
  );
}

function AgentEditor({
  agent,
  onClose,
  onSaved,
}: {
  agent: AdminAgent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(agent.name ?? agent.id);
  const [type, setType] = useState(agent.agent_type ?? "generic");
  const [model, setModel] = useState(agent.model ?? "");
  const [connection, setConnection] = useState(agent.connection_id ?? "");
  const [temperature, setTemperature] = useState(agent.temperature ?? 0.7);
  const [prompt, setPrompt] = useState(agent.system_prompt ?? "");
  const save = useMutation({
    mutationFn: () =>
      api.put(`/api/admin/agents/${encodeURIComponent(agent.id)}`, {
        name: name.trim(),
        agent_type: type,
        model: model.trim(),
        connection_id: connection.trim() || null,
        temperature,
        system_prompt: prompt,
      }),
    onSuccess: onSaved,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) save.mutate();
  };
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h3 className="modal-title">{t("agents.modal.title_edit")}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label>{t("agents.modal.field_name")}</label>
              <input
                className="input"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("agents.blueprint.type")}</label>
              <select
                className="select"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="generic">{t("agents.modal.type_generic")}</option>
                <option value="claude">{t("agents.modal.type_claude")}</option>
                <option value="openai">{t("agents.modal.type_openai")}</option>
                <option value="github">{t("errors.fields.github")}</option>
              </select>
            </div>
            <div className="field">
              <label>{t("agents.modal.tab_model")}</label>
              <input
                className="input"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("agents.filter.connection_label")}</label>
              <input
                className="input"
                value={connection}
                onChange={(event) => setConnection(event.target.value)}
              />
            </div>
            <div className="field">
              <label>{t("agents.modal.field_temp")}</label>
              <input
                className="input"
                type="number"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(event) => setTemperature(Number(event.target.value))}
              />
            </div>
            <div className="field">
              <label>{t("legacy.text_618e11e5922a")}</label>
              <textarea
                className="input"
                rows={6}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>
            {save.error && <p className="form-error">{errorText(save.error)}</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("agents.scan.folder_cancel_btn")}
            </button>
            <button className="btn btn-primary" disabled={save.isPending}>
              {save.isPending ? t("common.actions.saving") : t("common.actions.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminConnectionsPanel({
  connections,
  onReload,
}: {
  connections: AdminConnection[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [owner, setOwner] = useState("");
  const owners = useMemo(
    () =>
      [
        ...new Set(
          connections
            .map((connection) => connection.owner_email || connection.owner_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [connections],
  );
  const filtered = connections.filter(
    (connection) => !owner || (connection.owner_email || connection.owner_id) === owner,
  );
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/connections/${encodeURIComponent(id)}`),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="admin-toolbar">
        <select
          className="admin-select"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        >
          <option value="">{t("legacy.text_b7006384d86a")}</option>
          {owners.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {remove.error && <p className="form-error">{errorText(remove.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("agents.modal.field_name")}</th>
              <th>{t("agents.blueprint.type")}</th>
              <th>{t("agents.origin.owner")}</th>
              <th>{t("legacy.text_c38c6c1f3a27")}</th>
              <th>{t("teams.table.col_date")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((connection) => (
              <tr key={connection.id}>
                <td>
                  <span className="conn-name">{connection.name || connection.id}</span>
                </td>
                <td>
                  <span className="badge badge--type">{connection.type || "—"}</span>
                </td>
                <td className="td-owner">{connection.owner_email || connection.owner_id || "—"}</td>
                <td className="td-tokens">
                  {fmt((connection.tokens_in ?? 0) + (connection.tokens_out ?? 0))}
                </td>
                <td className="td-date">{date(connection.created_at)}</td>
                <td className="td-actions">
                  <button
                    className="btn-icon btn-icon--danger"
                    title={t("admin.delete_btn")}
                    aria-label={t("admin.delete_btn")}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(i18n.t("dynamic.text_3dac2f005418")))
                        remove.mutate(connection.id);
                    }}
                  >
                    <DeleteActionIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("legacy.text_2f0132ff81df")}</div>
      )}
    </>
  );
}

export function AdminKnowledgePanel({
  items,
  onReload,
}: {
  items: AdminKnowledge[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [owner, setOwner] = useState("");
  const owners = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => item.owner_email || item.owner_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [items],
  );
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        (!q ||
          `${item.title ?? item.id} ${item.owner_email ?? item.owner_id ?? ""}`
            .toLowerCase()
            .includes(q)) &&
        (!type || item.type === type) &&
        (!owner || (item.owner_email || item.owner_id) === owner),
    );
  }, [items, owner, search, type]);
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/knowledge/${encodeURIComponent(id)}`),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("legacy.text_1b6ed3aebc2b")}
        />
        <select
          className="admin-select"
          value={type}
          onChange={(event) => setType(event.target.value)}
        >
          <option value="">{t("legacy.text_71577ee2579a")}</option>
          <option value="url">{t("connections.modal.field_url")}</option>
          <option value="document">{t("legacy.text_8ae11c999390")}</option>
        </select>
        <select
          className="admin-select"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        >
          <option value="">{t("legacy.text_b7006384d86a")}</option>
          {owners.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {remove.error && <p className="form-error">{errorText(remove.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("errors.fields.title")}</th>
              <th>{t("agents.blueprint.type")}</th>
              <th>{t("agents.origin.owner")}</th>
              <th>{t("legacy.text_1ec303c9ea43")}</th>
              <th>{t("teams.table.col_date")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="conn-name">{item.title || item.id}</span>
                </td>
                <td>
                  <span className={`badge ${item.type === "url" ? "badge--ok" : "badge--type"}`}>
                    {item.type === "url" ? "URL" : "Doc"}
                  </span>
                </td>
                <td className="td-owner">{item.owner_email || item.owner_id || "—"}</td>
                <td className="td-tokens">
                  {(item.char_count ?? 0).toLocaleString(
                    i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES",
                  )}
                </td>
                <td className="td-date">{date(item.created_at)}</td>
                <td className="td-actions">
                  <button
                    className="btn-icon btn-icon--danger"
                    title={t("admin.delete_btn")}
                    aria-label={t("admin.delete_btn")}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(i18n.t("dynamic.text_6fbe51623c1f"))) remove.mutate(item.id);
                    }}
                  >
                    <DeleteActionIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("legacy.text_2397d785a6d8")}</div>
      )}
    </>
  );
}

export function AdminWorkflowsPanel({
  workflows,
  onReload,
}: {
  workflows: AdminWorkflow[];
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const owners = useMemo(
    () =>
      [
        ...new Set(
          workflows
            .map((item) => item.owner_email || item.owner_id)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [workflows],
  );
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workflows.filter(
      (item) =>
        (!q ||
          `${item.name ?? item.id} ${item.owner_email ?? item.owner_id ?? ""}`
            .toLowerCase()
            .includes(q)) &&
        (!owner || (item.owner_email || item.owner_id) === owner),
    );
  }, [workflows, owner, search]);
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/workflows/${encodeURIComponent(id)}`),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("admin.filters.search_workflow")}
        />
        <select
          className="admin-select"
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
        >
          <option value="">{t("admin.filters.all_owners")}</option>
          {owners.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {remove.error && <p className="form-error">{errorText(remove.error)}</p>}
      {filtered.length ? (
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t("admin.table.name")}</th>
              <th>{t("admin.table.owner")}</th>
              <th>{t("admin.table.steps")}</th>
              <th>{t("teams.table.col_date")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="conn-name">{item.name || item.id}</span>
                </td>
                <td className="td-owner">{item.owner_email || item.owner_id || "—"}</td>
                <td className="td-tokens">{item.steps ?? 0}</td>
                <td className="td-date">{date(item.updated_at)}</td>
                <td className="td-actions">
                  <button
                    className="btn-icon btn-icon--danger"
                    title={t("admin.delete_btn")}
                    aria-label={t("admin.delete_btn")}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(i18n.t("admin.confirm.delete_workflow"))) remove.mutate(item.id);
                    }}
                  >
                    <DeleteActionIcon />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="admin-empty">{t("admin.empty_workflows")}</div>
      )}
    </>
  );
}
