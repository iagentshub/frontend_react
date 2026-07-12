import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { BillingState, DeletionStatus, LicenseState } from "./types";

function errorText(error: unknown) { return error instanceof ApiError ? error.message : "No se pudo completar la operación."; }

export function PrivacySection({ deletion, onReload }: { deletion: DeletionStatus; onReload: () => void }) {
  const token = new URLSearchParams(location.search).get("deletion_token") ?? "";
  const request = useMutation({ mutationFn: () => api.post("/api/auth/me/request-deletion", {}), onSuccess: onReload });
  const cancel = useMutation({ mutationFn: () => api.post("/api/auth/me/cancel-deletion", { token }), onSuccess: onReload });
  return <>
    <div className="section-title">Privacidad</div>
    {deletion.scheduled && <div style={{ marginBottom: 24, padding: "14px 16px", borderRadius: 8, border: "1px solid var(--danger,#e55)", background: "color-mix(in srgb,var(--danger,#e55) 10%,transparent)" }}><div style={{ fontWeight: 600, color: "var(--danger,#e55)" }}>Cuenta programada para eliminación</div><p className="section-desc">Solicitud registrada {deletion.deletion_date ? new Date(deletion.deletion_date).toLocaleDateString("es-ES") : ""}. El borrado definitivo se realiza tras el periodo de gracia.</p><button className="btn btn-ghost btn-sm" disabled={!token || cancel.isPending} title={!token ? "Usa el enlace recibido por email" : undefined} onClick={() => cancel.mutate()}>Cancelar eliminación</button></div>}
    <div className="section-subtitle">Descargar mis datos</div><p className="section-desc">Descarga un ZIP con tus agentes, conversaciones, conocimiento y configuración.</p><a className="btn btn-ghost" href="/api/auth/me/export" download>Descargar mis datos</a>
    <div className="section-subtitle" style={{ marginTop: 32, color: "var(--danger,#e55)" }}>Eliminar cuenta</div><p className="section-desc">Todos tus datos se borrarán permanentemente tras un periodo de gracia de 30 días. Antes debes transferir o eliminar los grupos de los que seas propietario.</p><button className="btn btn-danger" disabled={deletion.scheduled || request.isPending} onClick={() => { if (confirm("¿Programar la eliminación de tu cuenta?")) request.mutate(); }}>{request.isPending ? "Solicitando…" : "Solicitar eliminación de cuenta"}</button>
    {(request.error || cancel.error) && <p className="form-error" role="alert">{errorText(request.error ?? cancel.error)}</p>}
  </>;
}

const plans = [
  { id: "free", name: "Novato", price: "Gratis", description: "Cuenta gratuita con acceso a grupos." },
  { id: "developer", name: "Soldado", price: "9 €/mes", description: "Uso personal, backups y soporte directo." },
  { id: "business", name: "Tropa", price: "desde 7,50 €/licencia/mes", description: "Equipos, panel de administración y onboarding." },
] as const;

export function BillingSection({ initial, onReload }: { initial: BillingState | null; onReload: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [annual, setAnnual] = useState(initial?.interval === "year");
  const [seats, setSeats] = useState(initial?.seats ?? 2);
  const current = initial?.tier ?? "free";
  const action = useMutation({
    mutationFn: async (kind: "change" | "cancel" | "reactivate" | "seats") => {
      if (kind === "cancel") return api.post("/api/billing/cancel", { immediate: false });
      if (kind === "reactivate") return api.post("/api/billing/reactivate", {});
      if (kind === "seats") return api.post("/api/billing/change-seats", { seats });
      if (selected === "free") return api.post("/api/billing/cancel", { immediate: false });
      return api.post("/api/billing/subscribe", { tier: selected, seats: selected === "business" ? Math.max(2, seats) : 1, interval: annual ? "year" : "month", self_hosted: false });
    },
    onSuccess: () => { setSelected(null); onReload(); },
  });
  const licenses = useQuery({ queryKey: ["profile", "licenses", current], queryFn: ({ signal }) => api.get<LicenseState>("/api/billing/licenses", signal), enabled: current === "business" });
  const license = useMutation({
    mutationFn: ({ username, assign }: { username: string; assign: boolean }) => assign ? api.post<LicenseState>(`/api/billing/licenses/${encodeURIComponent(username)}`, {}) : api.delete<LicenseState>(`/api/billing/licenses/${encodeURIComponent(username)}`),
    onSuccess: () => licenses.refetch(),
  });
  const [licenseSearch, setLicenseSearch] = useState("");
  const shownUsers = useMemo(() => (licenses.data?.users ?? []).filter((user) => !licenseSearch || `${user.username} ${user.email ?? ""}`.toLowerCase().includes(licenseSearch.toLowerCase())), [licenses.data, licenseSearch]);
  return <>
    <div className="section-title">Suscripción</div><p className="section-desc">{current === "free" ? "Selecciona un plan para contratar el servicio gestionado." : "Gestiona tu suscripción activa."}</p>
    <div className="billing-plans-grid">{plans.map((plan) => <button type="button" className={`billing-plan-card${current === plan.id ? " billing-plan-card--current" : ""}${selected === plan.id ? " billing-plan-card--selected" : ""}`} key={plan.id} onClick={() => setSelected(plan.id === current ? null : plan.id)}>{current === plan.id && <span className="billing-plan-badge">Tu plan</span>}<span className="billing-plan-name">{plan.name}</span><span className="billing-plan-price">{annual && plan.id !== "free" ? plan.price.replace("/mes", "/mes · anual") : plan.price}</span><span className="billing-plan-desc">{plan.description}</span></button>)}</div>
    {selected && selected !== "free" && <div className="billing-interval-toggle"><button className={`billing-int-btn${!annual ? " active" : ""}`} onClick={() => setAnnual(false)}>Mensual</button><button className={`billing-int-btn${annual ? " active" : ""}`} onClick={() => setAnnual(true)}>Anual <span className="billing-int-save">2 meses gratis</span></button></div>}
    {(selected === "business" || (!selected && current === "business")) && <div style={{ marginTop: 20 }}><div className="section-subtitle">Asientos del equipo</div><div style={{ display: "flex", gap: 8 }}><input className="input" type="number" min={2} max={100} style={{ width: 90 }} value={seats} onChange={(event) => setSeats(Number(event.target.value))} />{!selected && <button className="btn btn-ghost btn-sm" disabled={action.isPending} onClick={() => action.mutate("seats")}>Actualizar asientos</button>}</div></div>}
    {selected && <div style={{ marginTop: 20, display: "flex", gap: 8 }}><button className="btn btn-primary" disabled={action.isPending} onClick={() => action.mutate("change")}>{action.isPending ? "Procesando…" : `Actualizar a ${plans.find((plan) => plan.id === selected)?.name ?? selected}`}</button><button className="btn btn-ghost" onClick={() => setSelected(null)}>Cancelar</button></div>}
    {initial?.status && current !== "free" && <div className="profile-info-block" style={{ marginTop: 20 }}><div className="profile-info-row"><span className="profile-info-label">Estado</span><span className="profile-info-value">{initial.status}{initial.cancel_at_period_end ? " (se cancela al final del periodo)" : ""}</span></div><div className="profile-info-row"><span className="profile-info-label">Próxima renovación</span><span className="profile-info-value">{initial.current_period_end ? new Date(initial.current_period_end).toLocaleDateString("es-ES") : "—"}</span></div></div>}
    {current !== "free" && <div style={{ marginTop: 20 }}>{initial?.cancel_at_period_end ? <button className="btn btn-ghost" disabled={action.isPending} onClick={() => action.mutate("reactivate")}>Reactivar suscripción</button> : <button className="btn btn-ghost action-item--danger" disabled={action.isPending} onClick={() => { if (confirm("¿Cancelar la suscripción al final del periodo?")) action.mutate("cancel"); }}>Cancelar suscripción</button>}</div>}
    {current === "business" && <div style={{ marginTop: 28 }}><div className="section-subtitle">Licencias asignadas</div>{licenses.data && <p className="section-desc">{licenses.data.used} de {licenses.data.seats} licencias en uso. Disponibles: {licenses.data.available}.</p>}<input className="admin-search" type="search" value={licenseSearch} onChange={(event) => setLicenseSearch(event.target.value)} placeholder="Buscar usuario o email…" />{licenses.isPending ? <div className="admin-empty">Cargando licencias…</div> : licenses.error ? <p className="form-error">{errorText(licenses.error)}</p> : <table className="admin-table"><thead><tr><th>Usuario</th><th>Estado</th><th /></tr></thead><tbody>{shownUsers.map((user) => <tr key={user.username}><td>{user.email || user.username}</td><td><span className={`badge ${user.licensed ? "badge--ok" : "badge--warn"}`}>{user.licensed ? "Con licencia" : "Sin licencia"}</span></td><td className="td-actions">{user.username === licenses.data?.owner ? <span className="badge badge--std">Comprador</span> : <button className={`btn ${user.licensed ? "btn-ghost" : "btn-primary"} btn-sm`} disabled={license.isPending || (!user.licensed && (licenses.data?.available ?? 0) <= 0)} onClick={() => license.mutate({ username: user.username, assign: !user.licensed })}>{user.licensed ? "Quitar" : "Asignar"}</button>}</td></tr>)}</tbody></table>}</div>}
    {(action.error || license.error) && <p className="form-error">{errorText(action.error ?? license.error)}</p>}
  </>;
}
