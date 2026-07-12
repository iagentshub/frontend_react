import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { queryClient, queryKeys } from "@/api/query-client";
import { sessionQuery } from "@/auth/queries";
import type {
  Connection,
  ConnectionCategory,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionTestResult,
  DynamicFieldValue,
  ProviderField,
  Workspace,
} from "./types";
import "../../../assets/components/filter_connections/filter_connections.css";
import "../../../assets/components/conn-card/conn-card.css";
import "../../../assets/components/group-panel/group-panel.css";
import "../../../assets/components/group-share-dialog/group-share-dialog.css";
import "../../../assets/css/labels.css";
import "@/styles/routes/connections/connections.css";
import "./connections-page.css";

const categoryLabels: Record<ConnectionCategory, string> = {
  llm: "APIs LLM",
  machine: "Máquinas",
  database: "Bases de datos",
};

interface LabelOption {
  key: string;
  color: string;
}

interface LabelGroup {
  id: "environment" | "status";
  labels: readonly LabelOption[];
}

const labelGroups: readonly LabelGroup[] = [
  {
    id: "environment",
    labels: [
      { key: "production", color: "#0891b2" },
      { key: "staging", color: "#475569" },
      { key: "development", color: "#d97706" },
      { key: "test", color: "#7c3aed" },
    ],
  },
  {
    id: "status",
    labels: [
      { key: "favorite", color: "#f59e0b" },
      { key: "draft", color: "#8b5cf6" },
      { key: "review", color: "#f97316" },
      { key: "deprecated", color: "#ca8a04" },
      { key: "quarantine", color: "#ef4444" },
      { key: "archived", color: "#94a3b8" },
      { key: "delete", color: "#dc2626" },
    ],
  },
];

function useConnectionsT() {
  const { t } = useTranslation(["connections", "common", "labels"]);
  const translate = t as unknown as (key: string, ...args: unknown[]) => string;
  return (key: string, ...args: unknown[]) =>
    translate(key.replace(":", "."), ...args);
}

type Notice = { kind: "ok" | "error"; text: string } | null;

function categoryOf(provider: ConnectionProvider | undefined): ConnectionCategory {
  return provider?.category ?? "llm";
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

function fieldInitialValue(field: ProviderField, connection: Connection | null): DynamicFieldValue {
  const saved = connection?.[field.key];
  if (field.type === "checkbox") return saved === true || saved === "true" || saved === "1";
  if (field.type === "password") return "";
  if (typeof saved === "string" || typeof saved === "number") return String(saved);
  if (field.type === "select") return field.default ?? field.options?.[0]?.value ?? "";
  return field.default ?? "";
}

function initialDynamicValues(
  provider: ConnectionProvider | undefined,
  connection: Connection | null,
): Record<string, DynamicFieldValue> {
  return Object.fromEntries(
    (provider?.fields ?? []).map((field) => [field.key, fieldInitialValue(field, connection)]),
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m11 11 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CategoryIcon({ category }: { category: ConnectionCategory }) {
  if (category === "machine")
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5 14h6M8 11v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  if (category === "database")
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <ellipse cx="8" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M3 4v4c0 1.1 2.24 2 5 2s5-.9 5-2V4M3 8v4c0 1.1 2.24 2 5 2s5-.9 5-2V8"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      </svg>
    );
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8h6M8 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ActionIcon({ action }: { action: "test" | "edit" | "share" | "delete" }) {
  if (action === "test")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="m4 2.5 9 5.5-9 5.5v-11Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (action === "edit")
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="m11 2 3 3-9 9H2v-3l9-9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  if (action === "share")
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

function Modal({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
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
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  );
}

function DynamicField({
  field,
  value,
  values,
  editing,
  onChange,
}: {
  field: ProviderField;
  value: DynamicFieldValue;
  values: Record<string, DynamicFieldValue>;
  editing: boolean;
  onChange: (value: DynamicFieldValue) => void;
}) {
  if (field.depends_on) {
    const actual = String(values[field.depends_on] ?? "");
    if (actual !== (field.depends_value ?? "")) return null;
  }
  if (field.type === "checkbox") {
    return (
      <div className="field">
        <label className="toggle">
          <input
            type="checkbox"
            data-field-key={field.key}
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span className="toggle-track" />
          <span className="toggle-label">{field.label}</span>
        </label>
      </div>
    );
  }
  const label = (
    <label htmlFor={`conn-field-${field.key}`}>
      {field.label}
      {field.required && <span className="field-required"> *</span>}
    </label>
  );
  if (field.type === "select") {
    return (
      <div className="field">
        {label}
        <select
          id={`conn-field-${field.key}`}
          className="select"
          value={String(value)}
          required={field.required}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option value={option.value} key={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="field">
        {label}
        <textarea
          id={`conn-field-${field.key}`}
          className="input conn-dynamic-textarea"
          value={String(value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    );
  }
  return (
    <div className="field">
      {label}
      <input
        id={`conn-field-${field.key}`}
        className="input"
        type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
        value={String(value)}
        placeholder={field.placeholder}
        required={field.required && !(editing && field.type === "password")}
        autoComplete={field.type === "password" ? "new-password" : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {editing && field.type === "password" && (
        <span className="input-hint">Déjalo vacío para conservar el valor actual.</span>
      )}
      {field.key === "url" && field.default && (
        <span className="input-hint">Cámbiala si usas un proxy o una URL personalizada.</span>
      )}
    </div>
  );
}

function ConnectionEditor({
  connection,
  providers,
  workspacePersonal,
  onClose,
  onSaved,
}: {
  connection: Connection | null;
  providers: ConnectionProvider[];
  workspacePersonal: boolean;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const t = useConnectionsT();
  const initialProvider = providers.find((item) => item.type === connection?.type) ?? providers[0];
  const [type, setType] = useState(initialProvider?.type ?? "");
  const [name, setName] = useState(connection?.name ?? "");
  const [scope, setScope] = useState(connection?._personal_key ? "personal" : "workspace");
  const [labels, setLabels] = useState<string[]>(
    connection?.labels?.filter((label) => label !== "public") ?? ["private"],
  );
  const selectedProvider = providers.find((item) => item.type === type);
  const [values, setValues] = useState<Record<string, DynamicFieldValue>>(() =>
    initialDynamicValues(initialProvider, connection),
  );
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const save = useMutation({
    mutationFn: () => {
      const dynamic = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== "" && value !== false),
      );
      return api.post<Connection>("/api/connections", {
        ...(connection ? { id: connection.id } : {}),
        name: name.trim(),
        type,
        scope,
        labels: ["private", ...labels.filter((label) => label !== "private" && label !== "public")],
        ...dynamic,
      });
    },
    onSuccess: () => onSaved(t("connections:saved")),
  });

  const changeProvider = (nextType: string) => {
    setType(nextType);
    setValues(
      initialDynamicValues(
        providers.find((item) => item.type === nextType),
        null,
      ),
    );
  };
  const toggleLabel = (key: string) =>
    setLabels((current) => {
      if (current.includes(key)) return current.filter((label) => label !== key);
      const group = labelGroups.find((candidate) =>
        candidate.labels.some((label) => label.key === key),
      );
      return [
        ...current.filter((currentKey) => !group?.labels.some((label) => label.key === currentKey)),
        key,
      ];
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !type || save.isPending) return;
    save.mutate();
  };

  return (
    <Modal onClose={onClose} labelledBy="conn-modal-title-react">
      <form onSubmit={submit} noValidate={false}>
        <div className="modal-header">
          <span className="modal-title" id="conn-modal-title-react">
            {connection ? t("connections:modal.title_edit") : t("connections:modal.title_new")}
          </span>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label={t("common:actions.close", "Cerrar")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="m2 2 12 12M14 2 2 14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {save.isError && (
            <div className="form-error conn-modal-error" role="alert">
              {save.error.message}
            </div>
          )}
          <div className="field">
            <label htmlFor="conn-name-react">{t("connections:modal.field_name")} *</label>
            <input
              ref={nameRef}
              id="conn-name-react"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("connections:modal.placeholder_name")}
              required
              maxLength={120}
            />
          </div>
          <div className="field">
            <label htmlFor="conn-type-react">{t("connections:modal.field_provider")}</label>
            <select
              id="conn-type-react"
              className="select"
              value={type}
              onChange={(event) => changeProvider(event.target.value)}
              required
            >
              {providers.map((provider) => (
                <option value={provider.type} key={provider.type}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          {!workspacePersonal && (
            <div className="field">
              <label htmlFor="conn-scope-react">{t("connections:modal.field_scope")}</label>
              <select
                id="conn-scope-react"
                className="select"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="workspace">{t("connections:modal.scope_workspace")}</option>
                <option value="personal">{t("connections:modal.scope_personal")}</option>
              </select>
              <span className="input-hint">
                {scope === "personal"
                  ? t("connections:modal.scope_hint_personal")
                  : t("connections:modal.scope_hint_workspace")}
              </span>
            </div>
          )}
          {(selectedProvider?.fields ?? []).map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              values={values}
              editing={Boolean(connection)}
              onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
            />
          ))}
          <div className="field">
            <label>
              {t("labels:group.environment", "Entorno")} / {t("labels:group.status", "Estado")}
            </label>
            <div className="conn-label-editor">
              {labelGroups
                .flatMap((group) => group.labels)
                .map((label) => (
                  <label className="conn-label-option" key={label.key}>
                    <input
                      type="checkbox"
                      checked={labels.includes(label.key)}
                      onChange={() => toggleLabel(label.key)}
                    />
                    <span
                      className="label-chip"
                      style={{ "--lc": label.color } as React.CSSProperties}
                    >
                      {t(`labels:${label.key}`, label.key)}
                    </span>
                  </label>
                ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("common:actions.cancel", "Cancelar")}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={save.isPending || !name.trim() || !type}
          >
            {save.isPending
              ? t("common:status.saving", "Guardando…")
              : t("common:actions.save", "Guardar")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ShareDialog({
  connection,
  workspaces,
  onClose,
  onSaved,
}: {
  connection: Connection;
  workspaces: Workspace[];
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const groups = workspaces.filter((workspace) => workspace.type === "team");
  const shared = useQuery({
    queryKey: ["connections", connection.id, "shared-groups"],
    queryFn: ({ signal }) =>
      api
        .get<{ group_ids?: string[] }>(
          `/api/sharing/connection/${encodeURIComponent(connection.id)}/groups`,
          signal,
        )
        .catch(() => ({ group_ids: [] })),
  });
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const selected = useMemo(() => {
    const next = new Set(shared.data?.group_ids ?? []);
    Object.entries(overrides).forEach(([id, enabled]) => {
      if (enabled) next.add(id);
      else next.delete(id);
    });
    return next;
  }, [overrides, shared.data]);
  const save = useMutation({
    mutationFn: async () => {
      const before = new Set(shared.data?.group_ids ?? []);
      const add = [...selected].filter((id) => !before.has(id));
      const remove = [...before].filter((id) => !selected.has(id));
      await Promise.all([
        ...add.map((groupId) =>
          api.post(`/api/sharing/connection/${encodeURIComponent(connection.id)}`, {
            group_id: groupId,
          }),
        ),
        ...remove.map((groupId) =>
          api.delete(
            `/api/sharing/connection/${encodeURIComponent(connection.id)}?group_id=${encodeURIComponent(groupId)}`,
          ),
        ),
      ]);
    },
    onSuccess: () => onSaved("Acceso actualizado"),
  });
  return (
    <Modal onClose={onClose} labelledBy="conn-share-title">
      <div className="modal-header">
        <h2 className="modal-title" id="conn-share-title">
          Compartir — {connection.name}
        </h2>
        <button className="modal-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>
      </div>
      <div className="modal-body">
        <p className="gsd-subtitle">Selecciona los grupos de trabajo</p>
        {save.isError && (
          <div className="form-error" role="alert">
            {save.error.message}
          </div>
        )}
        <div className="gsd-groups">
          {groups.length ? (
            groups.map((group) => (
              <label className="gsd-group-row" key={group.id}>
                <input
                  className="gsd-checkbox"
                  type="checkbox"
                  checked={selected.has(group.id)}
                  onChange={(event) =>
                    setOverrides((current) => ({
                      ...current,
                      [group.id]: event.target.checked,
                    }))
                  }
                />
                <span className="gsd-group-name">{group.name}</span>
                <span className="gsd-badge">Compartido</span>
              </label>
            ))
          ) : (
            <p className="gsd-empty">No tienes grupos de trabajo.</p>
          )}
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          disabled={save.isPending || shared.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
}

function CreateGroupDialog({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (workspace: Workspace) => void;
}) {
  const [name, setName] = useState("");
  const mutation = useMutation({
    mutationFn: () => api.post<Workspace>("/api/workspaces", { name: name.trim() }),
    onSuccess: onSaved,
  });
  return (
    <Modal onClose={onClose} labelledBy="create-group-title">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) mutation.mutate();
        }}
      >
        <div className="modal-header">
          <h2 className="modal-title" id="create-group-title">
            Nuevo grupo de trabajo
          </h2>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">
          {mutation.isError && (
            <div className="form-error" role="alert">
              {mutation.error.message}
            </div>
          )}
          <div className="field">
            <label htmlFor="new-group-name">Nombre *</label>
            <input
              id="new-group-name"
              className="input"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!name.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Creando…" : "Crear grupo"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ConnectionCard({
  connection,
  provider,
  status,
  groupMode,
  onTest,
  onEdit,
  onShare,
  onDelete,
  onDragStart,
}: {
  connection: Connection;
  provider: ConnectionProvider | undefined;
  status: ConnectionStatus | undefined;
  groupMode: boolean;
  onTest: () => void;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onDragStart: (id: string) => void;
}) {
  const t = useConnectionsT();
  const total = (connection.tokens_in ?? 0) + (connection.tokens_out ?? 0);
  const sub = connection.model || connection.host || connection.url || "";
  const defaultUrl = provider?.fields?.find((field) => field.key === "url")?.default ?? "";
  const customUrl = Boolean(connection.url && connection.url !== defaultUrl);
  const state = status?.state ?? "idle";
  return (
    <article
      className="conn-card"
      data-status={state === "idle" ? undefined : state}
      draggable={!connection._shared}
      onDragStart={() => onDragStart(connection.id)}
    >
      <div className="conn-card-body">
        <div className="conn-card-name-row">
          <div className="conn-card-name" title={connection.name}>
            {connection.name}
          </div>
          {total > 0 && (
            <span
              className="conn-token-badge"
              title={`${formatTokens(connection.tokens_in ?? 0)} in / ${formatTokens(connection.tokens_out ?? 0)} out`}
            >
              {formatTokens(total)} tok
            </span>
          )}
          {groupMode && (
            <span className="conn-owner-badge">
              {connection._shared
                ? connection.owner_id
                  ? `@${connection.owner_id}`
                  : "Compartido"
                : "Tuyo"}
            </span>
          )}
          {connection._personal_key && (
            <span className="conn-scope-badge">{t("connections:card.scope_personal")}</span>
          )}
        </div>
        {(sub || customUrl) && (
          <div className="conn-card-sub" title={sub}>
            {sub}
            {customUrl && (
              <>
                {" "}
                <span className="conn-url-badge" title={connection.url}>
                  {t("connections:card.custom_url")}
                </span>
              </>
            )}
          </div>
        )}
        {Boolean(connection.labels?.filter((label) => label !== "private").length) && (
          <div className="label-chips-row conn-label-chips">
            {connection.labels
              ?.filter((label) => label !== "private" && label !== "public")
              .map((label) => {
                const def = labelGroups
                  .flatMap((group) => group.labels)
                  .find((item) => item.key === label);
                return (
                  <span
                    className="label-chip"
                    key={label}
                    style={{ "--lc": def?.color ?? "#94a3b8" } as React.CSSProperties}
                  >
                    {t(`labels:${label}`, label)}
                  </span>
                );
              })}
          </div>
        )}
        <div
          className="conn-card-status"
          data-ok={state === "ok" ? "true" : state === "error" ? "false" : undefined}
          role="status"
        >
          {state === "testing"
            ? t("connections:testing")
            : state === "ok"
              ? `${t("connections:test_ok")}${status?.message && !status.message.startsWith("OK") ? ` — ${status.message}` : ""}`
              : state === "error"
                ? `${t("connections:test_error")}${status?.message ? `: ${status.message}` : ""}${status?.detail && status.detail !== status.message ? ` — ${status.detail}` : ""}`
                : ""}
        </div>
      </div>
      <footer className="conn-card-footer">
        <button
          className="cca-btn cca-btn--test"
          type="button"
          onClick={onTest}
          disabled={state === "testing"}
          title={t("connections:actions.test")}
        >
          <ActionIcon action="test" />
        </button>
        <button
          className="cca-btn"
          type="button"
          onClick={onEdit}
          title={t("connections:actions.edit")}
        >
          <ActionIcon action="edit" />
        </button>
        {!connection._shared && (
          <button className="cca-btn" type="button" onClick={onShare} title="Compartir con grupo">
            <ActionIcon action="share" />
          </button>
        )}
        {!connection._shared && (
          <button
            className="cca-btn cca-btn--delete"
            type="button"
            onClick={onDelete}
            title={t("connections:actions.delete")}
          >
            <ActionIcon action="delete" />
          </button>
        )}
      </footer>
    </article>
  );
}

export function ConnectionsPage() {
  const t = useConnectionsT();
  const [category, setCategory] = useState<ConnectionCategory>("llm");
  const [queryText, setQueryText] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [groupsVisible, setGroupsVisible] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Connection | null | undefined>(undefined);
  const [shareTarget, setShareTarget] = useState<Connection | null>(null);
  const [createGroup, setCreateGroup] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);

  const providersQuery = useQuery({
    queryKey: ["connections", "providers"],
    queryFn: ({ signal }) => api.get<ConnectionProvider[]>("/api/connections/providers", signal),
    staleTime: 5 * 60_000,
  });
  const connectionsQuery = useQuery({
    queryKey: ["connections", "list", groupId],
    queryFn: ({ signal }) =>
      api.get<Connection[]>(
        groupId ? `/api/connections?group_id=${encodeURIComponent(groupId)}` : "/api/connections",
        signal,
      ),
  });
  const session = useQuery(sessionQuery);
  const workspaces = useQuery({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => api.get<Workspace[]>("/api/workspaces", signal).catch(() => []),
    staleTime: 60_000,
  });
  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const connections = useMemo(() => connectionsQuery.data ?? [], [connectionsQuery.data]);
  const providerByType = useMemo(
    () => new Map(providers.map((provider) => [provider.type, provider])),
    [providers],
  );
  const categoryProviders = useMemo(
    () => providers.filter((provider) => categoryOf(provider) === category),
    [category, providers],
  );

  const filtered = useMemo(() => {
    const search = queryText.trim().toLocaleLowerCase();
    return connections.filter((connection) => {
      if (!groupId && categoryOf(providerByType.get(connection.type)) !== category) return false;
      if (
        search &&
        !`${connection.name} ${connection.model ?? ""} ${connection.host ?? ""}`
          .toLocaleLowerCase()
          .includes(search)
      )
        return false;
      if (selectedTypes.length && !selectedTypes.includes(connection.type)) return false;
      if (
        selectedLabels.length &&
        !selectedLabels.every((label) => connection.labels?.includes(label))
      )
        return false;
      return true;
    });
  }, [category, connections, groupId, providerByType, queryText, selectedLabels, selectedTypes]);

  const orderedGroups = useMemo(() => {
    const order = groupId
      ? [...new Set(filtered.map((connection) => connection.type))]
      : categoryProviders.map((provider) => provider.type);
    return order
      .map((type) => ({ type, items: filtered.filter((connection) => connection.type === type) }))
      .filter((group) => group.items.length);
  }, [categoryProviders, filtered, groupId]);

  const runTests = useMutation({
    mutationFn: async (ids: string[]) => {
      const sharedIds = ids.filter((id) => connections.find((item) => item.id === id)?._shared);
      const ownIds = ids.filter((id) => !sharedIds.includes(id));
      const [bulk, shared] = await Promise.all([
        ownIds.length
          ? api.post<ConnectionTestResult[]>("/api/connections/test-all", { ids: ownIds })
          : Promise.resolve([]),
        Promise.all(
          sharedIds.map(async (id) => {
            const result = await api.post<Omit<ConnectionTestResult, "id">>(
              `/api/connections/${encodeURIComponent(id)}/test`,
            );
            return { id, ...result };
          }),
        ),
      ]);
      return [...bulk, ...shared];
    },
    onMutate: (ids) =>
      setStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          ids.map((id) => [id, { state: "testing" } satisfies ConnectionStatus]),
        ),
      })),
    onSuccess: (results, requestedIds) =>
      setStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          requestedIds.map((id) => {
            const result = results.find((item) => item.id === id);
            return result
              ? [
                  result.id,
                  {
                    state: result.ok ? "ok" : "error",
                    ...(result.message ? { message: result.message } : {}),
                    ...(result.detail ? { detail: result.detail } : {}),
                  } satisfies ConnectionStatus,
                ]
              : [id, { state: "error", message: "La conexión ya no está disponible" }];
          }),
        ),
      })),
    onError: (error, ids) =>
      setStatuses((current) => ({
        ...current,
        ...Object.fromEntries(
          ids.map((id) => [
            id,
            { state: "error", message: error.message } satisfies ConnectionStatus,
          ]),
        ),
      })),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/connections/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      setNotice({ kind: "ok", text: t("connections:deleted") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.connections });
      await connectionsQuery.refetch();
    },
    onError: (error) => setNotice({ kind: "error", text: error.message }),
  });

  const editConnection = async (connection: Connection) => {
    setNotice(null);
    try {
      setEditor(await api.get<Connection>(`/api/connections/${encodeURIComponent(connection.id)}`));
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo cargar la conexión",
      });
    }
  };
  const saved = async (text: string) => {
    setEditor(undefined);
    setShareTarget(null);
    setNotice({ kind: "ok", text });
    await queryClient.invalidateQueries({ queryKey: queryKeys.connections });
    await connectionsQuery.refetch();
  };
  const chooseCategory = (next: ConnectionCategory) => {
    setCategory(next);
    setSelectedTypes([]);
    setSelectedLabels([]);
  };
  const clearFilters = () => {
    setQueryText("");
    setSelectedTypes([]);
    setSelectedLabels([]);
  };
  const hasFilters = Boolean(queryText || selectedTypes.length || selectedLabels.length);

  const shareByDrop = async (targetGroupId: string) => {
    const id = draggedId;
    setDraggedId(null);
    setDropGroupId(null);
    if (!id) return;
    try {
      await api.post(`/api/sharing/connection/${encodeURIComponent(id)}`, {
        group_id: targetGroupId,
      });
      setNotice({ kind: "ok", text: "Conexión compartida con el grupo" });
    } catch (error) {
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "No se pudo compartir",
      });
    }
  };

  if (providersQuery.isPending || connectionsQuery.isPending)
    return (
      <main className="page-content connections-react">
        <div className="conn-empty">Cargando conexiones…</div>
      </main>
    );
  if (providersQuery.isError || connectionsQuery.isError)
    return (
      <main className="page-content connections-react">
        <div className="empty-state">
          <p>No se pudieron cargar las conexiones.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              void providersQuery.refetch();
              void connectionsQuery.refetch();
            }}
          >
            Reintentar
          </button>
        </div>
      </main>
    );

  return (
    <main className="page-content connections-react">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("connections:page.title")}</h1>
          <p className="page-subtitle">{t("connections:page.subtitle")}</p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost"
            type="button"
            disabled={runTests.isPending || filtered.length === 0}
            onClick={() => runTests.mutate(filtered.map((connection) => connection.id))}
          >
            <ActionIcon action="test" />
            <span>{t("connections:page.test_all")}</span>
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!providers.length}
            onClick={() => setEditor(null)}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <path
                d="M6.5 1v11M1 6.5h11"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <span>{t("connections:page.new_btn")}</span>
          </button>
        </div>
      </div>
      {notice && (
        <div
          className={`conn-notice${notice.kind === "error" ? " conn-notice--error" : ""}`}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.text}
        </div>
      )}
      <div className="conn-category-tabs" role="tablist" aria-label="Categoría de conexión">
        {(["llm", "machine", "database"] as const).map((item) => (
          <button
            className={`conn-cat-tab${category === item ? " active" : ""}`}
            type="button"
            role="tab"
            aria-selected={category === item}
            key={item}
            onClick={() => chooseCategory(item)}
          >
            <CategoryIcon category={item} />
            {categoryLabels[item]}
          </button>
        ))}
      </div>
      <div className="fco-bar">
        <div className="fco-top-row">
          <div className="fco-search-wrap">
            <SearchIcon />
            <input
              className="fco-search-input"
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder={t("connections:filter.search_placeholder")}
              aria-label={t("connections:filter.search_placeholder")}
            />
            {queryText && (
              <button
                className="fco-search-clear"
                type="button"
                onClick={() => setQueryText("")}
                aria-label="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>
          <div className="conn-label-filters">
            {labelGroups.map((group) => (
              <div
                className={`fco-lbl-sel-wrap${selectedLabels.some((key) => group.labels.some((label) => label.key === key)) ? " fco-lbl-sel-wrap--on" : ""}`}
                key={group.id}
              >
                <select
                  className="fco-lbl-select"
                  value={
                    selectedLabels.find((key) => group.labels.some((label) => label.key === key)) ??
                    ""
                  }
                  aria-label={t(`labels:group.${group.id}`, group.id)}
                  onChange={(event) =>
                    setSelectedLabels((current) => [
                      ...current.filter((key) => !group.labels.some((label) => label.key === key)),
                      ...(event.target.value ? [event.target.value] : []),
                    ])
                  }
                >
                  <option value="">{t(`labels:group.${group.id}`, group.id)}…</option>
                  {group.labels.map((label) => (
                    <option value={label.key} key={label.key}>
                      {t(`labels:${label.key}`, label.key)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {hasFilters && (
            <button type="button" className="fco-clear-all" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>
        <div className="fco-chips-row">
          {(groupId ? providers : categoryProviders).map((provider) => (
            <button
              type="button"
              className={`fco-chip${selectedTypes.includes(provider.type) ? " fco-chip--active" : ""}`}
              key={provider.type}
              onClick={() =>
                setSelectedTypes((current) =>
                  current.includes(provider.type)
                    ? current.filter((item) => item !== provider.type)
                    : [...current, provider.type],
                )
              }
            >
              {provider.label}
            </button>
          ))}
        </div>
      </div>
      <div className="af-wrapper">
        <div className="folder-toggle-row">
          <button
            className={`folder-toggle-btn${groupsVisible ? " folder-toggle-btn--on" : ""}`}
            type="button"
            title={groupsVisible ? "Ocultar grupos" : "Grupos de trabajo"}
            onClick={() => setGroupsVisible((visible) => !visible)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="11" cy="5" r="2" stroke="currentColor" strokeWidth="1.4" />
              <path
                d="M1.5 13v-.5A3.5 3.5 0 0 1 5 9a3.5 3.5 0 0 1 3.5 3.5V13M9 9.2a3.5 3.5 0 0 1 5.5 3.3v.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="af-layout">
          <div className={`af-groups-panel${groupsVisible ? "" : " folder-panel--collapsed"}`}>
            <div className="kf-section-header">
              <span className="kf-section-label">Grupos</span>
              {session.data?.role !== "guest" && (
                <button
                  className="kf-add-btn"
                  title="Nuevo grupo"
                  onClick={() => setCreateGroup(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              )}
            </div>
            <button
              className={`kf-item${groupId === null ? " kf-item--active" : ""}`}
              type="button"
              onClick={() => {
                setGroupId(null);
                setSelectedTypes([]);
              }}
            >
              <span className="kf-item-name">Todos</span>
            </button>
            {(workspaces.data ?? [])
              .filter((workspace) => workspace.type === "team")
              .map((workspace) => (
                <button
                  className={`kf-item gp-item${groupId === workspace.id ? " kf-item--active" : ""}${dropGroupId === workspace.id ? " conn-group-drop-active" : ""}`}
                  type="button"
                  key={workspace.id}
                  title={`Arrastra aquí para compartir con ${workspace.name}`}
                  onClick={() => {
                    setGroupId(workspace.id);
                    setSelectedTypes([]);
                  }}
                  onDragOver={(event) => {
                    if (draggedId) {
                      event.preventDefault();
                      setDropGroupId(workspace.id);
                    }
                  }}
                  onDragLeave={() => setDropGroupId(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    void shareByDrop(workspace.id);
                  }}
                >
                  <span className="kf-item-name">{workspace.name}</span>
                </button>
              ))}
            {!(workspaces.data ?? []).some((workspace) => workspace.type === "team") && (
              <p className="gp-empty">No perteneces a ningún grupo.</p>
            )}
          </div>
          <div className="af-content">
            {orderedGroups.length ? (
              orderedGroups.map((group) => (
                <section className="conn-group" key={group.type}>
                  <div className="conn-group-header">
                    <span className={`conn-group-label conn-group-label--${group.type}`}>
                      {providerByType.get(group.type)?.label ?? group.type}
                    </span>
                    <span className="conn-group-count">
                      {group.items.length === 1
                        ? t("connections:count_one", { n: group.items.length })
                        : t("connections:count_many", { n: group.items.length })}
                    </span>
                    <button
                      className="conn-group-test"
                      type="button"
                      disabled={runTests.isPending}
                      onClick={() =>
                        runTests.mutate(group.items.map((connection) => connection.id))
                      }
                    >
                      <ActionIcon action="test" />
                      {t("connections:test_group")}
                    </button>
                  </div>
                  <div className="conn-group-grid">
                    {group.items.map((connection) => (
                      <ConnectionCard
                        key={connection.id}
                        connection={connection}
                        provider={providerByType.get(connection.type)}
                        status={statuses[connection.id]}
                        groupMode={Boolean(groupId)}
                        onTest={() => runTests.mutate([connection.id])}
                        onEdit={() => void editConnection(connection)}
                        onShare={() => setShareTarget(connection)}
                        onDelete={() => {
                          if (window.confirm(t("connections:confirm_delete")))
                            remove.mutate(connection.id);
                        }}
                        onDragStart={setDraggedId}
                      />
                    ))}
                  </div>
                </section>
              ))
            ) : (
              <div className="conn-empty">
                {hasFilters ? t("connections:empty_filtered") : t("connections:empty_none")}
              </div>
            )}
          </div>
        </div>
      </div>
      {editor !== undefined && (
        <ConnectionEditor
          connection={editor}
          providers={providers.filter(
            (provider) =>
              categoryOf(provider) ===
              (editor ? categoryOf(providerByType.get(editor.type)) : category),
          )}
          workspacePersonal={session.data?.workspace_personal !== false}
          onClose={() => setEditor(undefined)}
          onSaved={(text) => void saved(text)}
        />
      )}{" "}
      {shareTarget && (
        <ShareDialog
          connection={shareTarget}
          workspaces={workspaces.data ?? []}
          onClose={() => setShareTarget(null)}
          onSaved={(text) => void saved(text)}
        />
      )}{" "}
      {createGroup && (
        <CreateGroupDialog
          onClose={() => setCreateGroup(false)}
          onSaved={(workspace) => {
            setCreateGroup(false);
            queryClient.setQueryData<Workspace[]>(["workspaces"], (current = []) => [
              ...current,
              workspace,
            ]);
            setGroupsVisible(true);
            setNotice({ kind: "ok", text: "Grupo creado" });
          }}
        />
      )}
    </main>
  );
}

