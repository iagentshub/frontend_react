import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { api, ApiError } from "@/api/client";
import type { AdminStats, CheckUpdateResult, PlatformConfig } from "./types";

function formatTokens(value: number) { return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K` : String(value); }
function errorText(error: unknown, t: TFunction) { return error instanceof ApiError ? error.message : t("admin.config.save_error_fallback"); }

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
    return t("admin.config.update_available", { latest: result.latest_version, current: result.current_version });
  }
  return t("admin.config.up_to_date", { version: result.current_version });
}

export function AdminOverview({ stats }: { stats: AdminStats }) {
  const cards = [
    { icon: "users", value: stats.users_total, label: "Usuarios", sub: `${stats.users_active} activos · ${stats.users_verified} verificados` },
    { icon: "connections", value: stats.connections_total, label: "Conexiones", sub: `${formatTokens(stats.tokens_in + stats.tokens_out)} tokens totales` },
    { icon: "agents", value: stats.agents_public + stats.agents_private, label: "Agentes", sub: `${stats.agents_public} públicos · ${stats.agents_private} privados` },
    { icon: "tokens", value: formatTokens(stats.tokens_in + stats.tokens_out), label: "Tokens consumidos", sub: `${formatTokens(stats.tokens_in)} in · ${formatTokens(stats.tokens_out)} out` },
  ];
  return <div id="stats-grid" className="admin-stats-grid">{cards.map((card) => <div className="admin-stat-card" key={card.label}><div className="stat-icon" aria-hidden="true"><AdminStatIcon kind={card.icon} /></div><div className="stat-body"><div className="stat-value">{card.value}</div><div className="stat-label">{card.label}</div><div className="stat-sub">{card.sub}</div></div></div>)}</div>;
}

function AdminStatIcon({ kind }: { kind: string }) {
  if (kind === "users") return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/><path d="M2.5 14c0-3.04 2.46-5.5 5.5-5.5s5.5 2.46 5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
  if (kind === "connections") return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="13" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M4 6v2a4 4 0 0 0 4 4m0 0V6m0 6a4 4 0 0 0 4-4V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
  if (kind === "agents") return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="3" y="6" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 6V4.5a2 2 0 0 1 4 0V6" stroke="currentColor" strokeWidth="1.4"/><circle cx="6" cy="10" r="1" fill="currentColor"/><circle cx="10" cy="10" r="1" fill="currentColor"/><path d="M6.5 12.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
  return <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M9.5 2L4 9h7l-4.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export function AdminConfigPanel({ initial, onSaved }: { initial: PlatformConfig; onSaved: (value: PlatformConfig) => void }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(false);
  const save = useMutation({ mutationFn: () => api.put<PlatformConfig>("/api/settings/platform", { ...config, registration: config.registration === "invite" ? "closed" : config.registration }), onSuccess: (value) => { setConfig(value); setSaved(true); onSaved(value); } });
  const checkUpdate = useMutation({ mutationFn: () => api.get<CheckUpdateResult>("/api/admin/check-update") });
  const set = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));
  // Aplica al momento (arranca/para "watchtower" de verdad) — por eso vive
  // fuera de PlatformConfigUpdate y de la mutación save() de arriba. El
  // checkbox es controlado por config.auto_update_enabled, así que si la
  // llamada falla y no lo actualizamos, el toggle no llega a moverse.
  const autoUpdate = useMutation({
    mutationFn: (enabled: boolean) => api.put<{ auto_update_enabled: boolean }>("/api/admin/auto-update", { enabled }),
    onSuccess: (value) => set("auto_update_enabled", value.auto_update_enabled),
  });
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(false); save.mutate(); };
  return <form onSubmit={submit}><div className="admin-config-grid"><div className="admin-config-section"><div className="admin-config-title">{t("admin.config.section_registration")}</div><div className="admin-config-row"><span className="admin-config-label">{t("admin.config.mode_label")}</span><select className="select admin-config-select" value={config.registration === "invite" ? "closed" : config.registration} onChange={(event) => set("registration", event.target.value as "open" | "closed")}><option value="open">{t("admin.config.mode_open")}</option><option value="closed">{t("admin.config.mode_closed")}</option></select></div><div className="admin-config-row"><span className="admin-config-label">{t("admin.config.max_users_label")} <span className="admin-config-hint">{t("admin.config.unlimited_hint")}</span></span><input className="input admin-config-num" type="number" min={0} value={config.max_users} onChange={(event) => set("max_users", Number(event.target.value))} /></div><Toggle label={t("admin.config.email_verify_label")} value={config.email_verify} onChange={(value) => set("email_verify", value)} /><Toggle label={t("admin.config.guest_enabled_label")} value={config.guest_enabled} onChange={(value) => set("guest_enabled", value)} /><Toggle label={t("admin.config.landing_enabled_label")} value={config.landing_enabled} onChange={(value) => set("landing_enabled", value)} /></div><div className="admin-config-section"><div className="admin-config-title">{t("admin.config.section_sessions")}</div><div className="admin-config-row"><span className="admin-config-label">{t("admin.config.max_sessions_label")} <span className="admin-config-hint">{t("admin.config.unlimited_hint")}</span></span><input className="input admin-config-num" type="number" min={0} value={config.max_concurrent_sessions} onChange={(event) => set("max_concurrent_sessions", Number(event.target.value))} /></div><div className="admin-config-title" style={{ marginTop: 20 }}>{t("admin.config.section_logs")}</div><div className="admin-config-row"><span className="admin-config-label">{t("admin.config.retention_label")}</span><input className="input admin-config-num" type="number" min={1} max={365} value={config.log_retention_days} onChange={(event) => set("log_retention_days", Number(event.target.value))} /></div><div className="admin-config-title" style={{ marginTop: 20 }}>{t("admin.config.section_billing")}</div><Toggle label={t("admin.config.billing_enabled_label")} value={config.billing_enabled} onChange={(value) => set("billing_enabled", value)} /></div><div className="admin-config-section"><div className="admin-config-title">{t("admin.config.section_oauth")}</div><Toggle label={t("admin.config.oauth_google_label")} value={config.oauth_google_enabled} onChange={(value) => set("oauth_google_enabled", value)} /><Toggle label={t("admin.config.oauth_apple_label")} value={config.oauth_apple_enabled} onChange={(value) => set("oauth_apple_enabled", value)} /><Toggle label={t("admin.config.oauth_microsoft_label")} value={config.oauth_microsoft_enabled} onChange={(value) => set("oauth_microsoft_enabled", value)} /></div><div className="admin-config-section"><div className="admin-config-title">{t("admin.config.section_updates")}</div><div className="admin-config-toggle-row"><label className="toggle"><input type="checkbox" checked={config.auto_update_enabled} disabled={autoUpdate.isPending} onChange={(event) => autoUpdate.mutate(event.target.checked)} /><span className="toggle-track" /><span className="toggle-label">{t("admin.config.auto_update_label")}</span></label></div>{autoUpdate.error && <div className="admin-config-hint">{errorText(autoUpdate.error, t)}</div>}<div className="admin-config-row" style={{ marginTop: 10 }}><button type="button" className="btn btn-ghost btn-sm" disabled={checkUpdate.isPending} onClick={() => checkUpdate.mutate()}>{checkUpdate.isPending ? t("admin.config.check_update_btn_loading") : t("admin.config.check_update_btn")}</button></div>{checkUpdate.data && <div className="admin-config-hint">{describeCheckUpdate(checkUpdate.data, t)}</div>}{checkUpdate.error && <div className="admin-config-hint">{t("admin.config.check_update_error")}</div>}</div></div><div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}><button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? t("admin.config.save_btn_loading") : t("admin.config.save_btn")}</button>{saved && <span style={{ color: "var(--success)" }}>{t("admin.config.saved_msg")}</span>}</div>{save.error && <p className="form-error">{errorText(save.error, t)}</p>}</form>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="admin-config-toggle-row"><label className="toggle"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track" /><span className="toggle-label">{label}</span></label></div>;
}
