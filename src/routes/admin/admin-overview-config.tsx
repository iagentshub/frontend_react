import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { AdminStats, PlatformConfig } from "./types";

function formatTokens(value: number) { return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1_000 ? `${(value / 1_000).toFixed(1)}K` : String(value); }
function errorText(error: unknown) { return error instanceof ApiError ? error.message : "No se pudo guardar la configuración."; }

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
  const [config, setConfig] = useState(initial);
  const [saved, setSaved] = useState(false);
  const save = useMutation({ mutationFn: () => api.put<PlatformConfig>("/api/settings/platform", { ...config, registration: config.registration === "invite" ? "closed" : config.registration }), onSuccess: (value) => { setConfig(value); setSaved(true); onSaved(value); } });
  const set = <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => setConfig((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(false); save.mutate(); };
  return <form onSubmit={submit}><div className="admin-config-grid"><div className="admin-config-section"><div className="admin-config-title">Registro</div><div className="admin-config-row"><span className="admin-config-label">Modo</span><select className="select admin-config-select" value={config.registration === "invite" ? "closed" : config.registration} onChange={(event) => set("registration", event.target.value as "open" | "closed")}><option value="open">Abierto</option><option value="closed">Cerrado</option></select></div><div className="admin-config-row"><span className="admin-config-label">Máx. usuarios <span className="admin-config-hint">(0=∞)</span></span><input className="input admin-config-num" type="number" min={0} value={config.max_users} onChange={(event) => set("max_users", Number(event.target.value))} /></div><Toggle label="Verificar email al registrarse" value={config.email_verify} onChange={(value) => set("email_verify", value)} /><Toggle label="Acceso como invitado" value={config.guest_enabled} onChange={(value) => set("guest_enabled", value)} /><Toggle label={'Landing de presentación en "/"'} value={config.landing_enabled} onChange={(value) => set("landing_enabled", value)} /></div><div className="admin-config-section"><div className="admin-config-title">Sesiones</div><div className="admin-config-row"><span className="admin-config-label">Máx. sesiones simultáneas <span className="admin-config-hint">(0=∞)</span></span><input className="input admin-config-num" type="number" min={0} value={config.max_concurrent_sessions} onChange={(event) => set("max_concurrent_sessions", Number(event.target.value))} /></div><div className="admin-config-title" style={{ marginTop: 20 }}>Logs</div><div className="admin-config-row"><span className="admin-config-label">Retención (días)</span><input className="input admin-config-num" type="number" min={1} max={365} value={config.log_retention_days} onChange={(event) => set("log_retention_days", Number(event.target.value))} /></div><div className="admin-config-title" style={{ marginTop: 20 }}>Facturación</div><Toggle label="Activar planes de suscripción" value={config.billing_enabled} onChange={(value) => set("billing_enabled", value)} /></div></div><div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}><button className="btn btn-primary" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar configuración"}</button>{saved && <span style={{ color: "var(--success)" }}>✓ Configuración guardada</span>}</div>{save.error && <p className="form-error">{errorText(save.error)}</p>}</form>;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <div className="admin-config-toggle-row"><label className="toggle"><input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span className="toggle-track" /><span className="toggle-label">{label}</span></label></div>;
}
