import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { TFunction } from "i18next";
import { api, ApiError } from "@/api/client";
import type { AdminStats, CheckUpdateResult, PlatformConfig } from "./types";

function formatTokens(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toFixed(1)}M`
    : value >= 1_000
      ? `${(value / 1_000).toFixed(1)}K`
      : String(value);
}
function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : i18n.t("common.errors.save_config");
}

// Solo consulta si hay actualización disponible (Docker Hub) — no la aplica.
// Aplicarla es cosa de Watchtower (automático, cada hora por defecto) o de
// `docker compose pull && up -d` manual.
function describeCheckUpdate(result: CheckUpdateResult, t: TFunction): string {
  if (!result.checked) {
    if (result.reason === "no_version") return t("admin.config.no_version");
    if (result.reason === "no_remote_versions") return t("admin.config.no_remote_versions");
    return t("admin.config.check_update_unknown");
  }
  if (result.update_available) {
    return t("admin.config.update_available", {
      latest: result.latest_version,
      current: result.current_version,
    });
  }
  return t("admin.config.up_to_date", { version: result.current_version });
}

export function AdminOverview({ stats }: { stats: AdminStats }) {
  const { t } = useTranslation();
  const cards = [
    {
      icon: "users",
      value: stats.users_total,
      label: t("admin.tabs.users"),
      sub: t("admin.overview.active_verified", {
        active: stats.users_active,
        verified: stats.users_verified,
      }),
    },
    {
      icon: "connections",
      value: stats.connections_total,
      label: t("admin.tabs.connections"),
      sub: t("admin.overview.total_tokens", {
        tokens: formatTokens(stats.tokens_in + stats.tokens_out),
      }),
    },
    {
      icon: "agents",
      value: stats.agents_public + stats.agents_private,
      label: t("admin.tabs.agents"),
      sub: i18n.t("dynamic.admin_agents_summary", {
        public: stats.agents_public,
        private: stats.agents_private,
      }),
    },
    {
      icon: "workflows",
      value: stats.workflows_total,
      label: t("admin.tabs.workflows"),
      sub: "",
    },
    {
      icon: "tokens",
      value: formatTokens(stats.tokens_in + stats.tokens_out),
      label: t("admin.overview.tokens_consumed"),
      sub: `${formatTokens(stats.tokens_in)} in · ${formatTokens(stats.tokens_out)} out`,
    },
  ];
  return (
    <div id="stats-grid" className="admin-stats-grid">
      {cards.map((card) => (
        <div className="admin-stat-card" key={card.label}>
          <div className="stat-icon" aria-hidden="true">
            <AdminStatIcon kind={card.icon} />
          </div>
          <div className="stat-body">
            <div className="stat-value">{card.value}</div>
            <div className="stat-label">{card.label}</div>
            <div className="stat-sub">{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminStatIcon({ kind }: { kind: string }) {
  if (kind === "users")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "connections")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="13" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    );
  if (kind === "agents")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="6" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M6 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6" cy="10" r="1" fill="currentColor" />
        <circle cx="10" cy="10" r="1" fill="currentColor" />
        <path d="M6.5 12.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  if (kind === "workflows")
    return (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="13" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="3" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M4.5 3h2A2.5 2.5 0 0 1 9 5.5v0A2.5 2.5 0 0 0 11.5 8H9A2.5 2.5 0 0 0 6.5 10.5v0A2.5 2.5 0 0 1 4 13H4.5"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
      <path
        d="M9.5 2L4 9h7l-4.5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminConfigPanel({
  initial,
  onSaved,
}: {
  initial: PlatformConfig;
  onSaved: (value: PlatformConfig) => void;
}) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      api.put<PlatformConfig>("/api/settings/platform", {
        ...config,
        registration: config.registration === "invite" ? "closed" : config.registration,
      }),
    onSuccess: (value) => {
      setConfig(value);
      setSaved(true);
      onSaved(value);
    },
  });
  const checkUpdate = useMutation({
    mutationFn: () => api.get<CheckUpdateResult>("/api/admin/check-update"),
  });
  const set = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) =>
    setConfig((current) => ({ ...current, [key]: value }));
  // Aplica al momento (arranca/para "watchtower" de verdad) — por eso vive
  // fuera de PlatformConfigUpdate y de la mutación save() de arriba. El
  // checkbox es controlado por config.auto_update_enabled, así que si la
  // llamada falla y no lo actualizamos, el toggle no llega a moverse.
  const autoUpdate = useMutation({
    mutationFn: (enabled: boolean) =>
      api.put<{ auto_update_enabled: boolean }>("/api/admin/auto-update", { enabled }),
    onSuccess: (value) => set("auto_update_enabled", value.auto_update_enabled),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    save.mutate();
  };
  return (
    <form onSubmit={submit}>
      <div className="admin-config-grid">
        <div className="admin-config-section">
          <div className="admin-config-title">{t("admin.table.created")}</div>
          <div className="admin-config-row">
            <span className="admin-config-label">{t("legacy.text_0efb19cb80a5")}</span>
            <select
              className="select admin-config-select"
              value={config.registration === "invite" ? "closed" : config.registration}
              onChange={(event) => set("registration", event.target.value as "open" | "closed")}
            >
              <option value="open">{t("legacy.text_8708aeb6736f")}</option>
              <option value="closed">{t("legacy.text_73b01db705a0")}</option>
            </select>
          </div>
          <div className="admin-config-row">
            <span className="admin-config-label">
              {t("errors.fields.max_users")}
              <span className="admin-config-hint">(0=∞)</span>
            </span>
            <input
              className="input admin-config-num"
              type="number"
              min={0}
              value={config.max_users}
              onChange={(event) => set("max_users", Number(event.target.value))}
            />
          </div>
          <Toggle
            label={t("legacy.text_d3c2f04a523a")}
            value={config.email_verify}
            onChange={(value) => set("email_verify", value)}
          />
          <Toggle
            label={t("docs.getting_started.accounts_guest_title")}
            value={config.guest_enabled}
            onChange={(value) => set("guest_enabled", value)}
          />
          <Toggle
            label={t("legacy.config_landing_enabled")}
            value={config.landing_enabled}
            onChange={(value) => set("landing_enabled", value)}
          />
        </div>
        <div className="admin-config-section">
          <div className="admin-config-title">{t("legacy.text_e27db7911d99")}</div>
          <div className="admin-config-row">
            <span className="admin-config-label">
              {t("legacy.text_9927542d91da")}
              <span className="admin-config-hint">(0=∞)</span>
            </span>
            <input
              className="input admin-config-num"
              type="number"
              min={0}
              value={config.max_concurrent_sessions}
              onChange={(event) => set("max_concurrent_sessions", Number(event.target.value))}
            />
          </div>
          <div className="admin-config-title" style={{ marginTop: 20 }}>
            {t("admin.logs.tab")}
          </div>
          <div className="admin-config-row">
            <span className="admin-config-label">{t("legacy.text_e04abfaff677")}</span>
            <input
              className="input admin-config-num"
              type="number"
              min={1}
              max={365}
              value={config.log_retention_days}
              onChange={(event) => set("log_retention_days", Number(event.target.value))}
            />
          </div>
          <div className="admin-config-title" style={{ marginTop: 20 }}>
            {t("pricing.calc_billing")}
          </div>
          <Toggle
            label={t("legacy.text_ce29c24fc6cb")}
            value={config.billing_enabled}
            onChange={(value) => set("billing_enabled", value)}
          />
        </div>
        <div className="admin-config-section">
          <div className="admin-config-title">{t("admin.config.section_oauth")}</div>
          <Toggle
            label={t("admin.config.oauth_google_label")}
            value={config.oauth_google_enabled}
            onChange={(value) => set("oauth_google_enabled", value)}
          />
          <Toggle
            label={t("admin.config.oauth_apple_label")}
            value={config.oauth_apple_enabled}
            onChange={(value) => set("oauth_apple_enabled", value)}
          />
          <Toggle
            label={t("admin.config.oauth_microsoft_label")}
            value={config.oauth_microsoft_enabled}
            onChange={(value) => set("oauth_microsoft_enabled", value)}
          />
        </div>
        <div className="admin-config-section">
          <div className="admin-config-title">{t("admin.config.section_updates")}</div>
          <div className="admin-config-toggle-row">
            <label className="toggle">
              <input
                type="checkbox"
                checked={config.auto_update_enabled}
                disabled={autoUpdate.isPending}
                onChange={(event) => autoUpdate.mutate(event.target.checked)}
              />
              <span className="toggle-track" />
              <span className="toggle-label">{t("admin.config.auto_update_label")}</span>
            </label>
          </div>
          {autoUpdate.error && (
            <div className="admin-config-hint">{errorText(autoUpdate.error)}</div>
          )}
          <div className="admin-config-row" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={checkUpdate.isPending}
              onClick={() => checkUpdate.mutate()}
            >
              {checkUpdate.isPending
                ? t("admin.config.check_update_btn_loading")
                : t("admin.config.check_update_btn")}
            </button>
          </div>
          {checkUpdate.data && (
            <div className="admin-config-hint">{describeCheckUpdate(checkUpdate.data, t)}</div>
          )}
          {checkUpdate.error && (
            <div className="admin-config-hint">{t("admin.config.check_update_error")}</div>
          )}
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn btn-primary" disabled={save.isPending}>
          {save.isPending ? "Guardando…" : i18n.t("dynamic.text_ca034f0fac8f")}
        </button>
        {saved && <span style={{ color: "var(--success)" }}>{t("legacy.text_a659c47c1712")}</span>}
      </div>
      {save.error && <p className="form-error">{errorText(save.error)}</p>}
    </form>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="admin-config-toggle-row">
      <label className="toggle">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="toggle-track" />
        <span className="toggle-label">{label}</span>
      </label>
    </div>
  );
}
