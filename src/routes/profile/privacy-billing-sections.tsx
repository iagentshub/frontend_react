import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { api, ApiError } from "@/api/client";
import type { BillingState, DeletionStatus, LicenseState } from "./types";

function errorText(error: unknown, t: TFunction) { return error instanceof ApiError ? error.message : t("profile.error_generic"); }

export function PrivacySection({ deletion, onReload }: { deletion: DeletionStatus; onReload: () => void }) {
  const { t } = useTranslation();
  const token = new URLSearchParams(location.search).get("deletion_token") ?? "";
  const request = useMutation({ mutationFn: () => api.post("/api/auth/me/request-deletion", {}), onSuccess: onReload });
  const cancel = useMutation({ mutationFn: () => api.post("/api/auth/me/cancel-deletion", { token }), onSuccess: onReload });
  return <>
    <div className="section-title">{t("profile.privacy.page_title")}</div>
    {deletion.scheduled && <div style={{ marginBottom: 24, padding: "14px 16px", borderRadius: 8, border: "1px solid var(--danger,#e55)", background: "color-mix(in srgb,var(--danger,#e55) 10%,transparent)" }}><div style={{ fontWeight: 600, color: "var(--danger,#e55)" }}>{t("profile.privacy.deletion_scheduled_title")}</div><p className="section-desc">{t("profile.privacy.deletion_scheduled_date", { date: deletion.deletion_date ? new Date(deletion.deletion_date).toLocaleDateString("es-ES") : "" })}</p><button className="btn btn-ghost btn-sm" disabled={!token || cancel.isPending} title={!token ? t("profile.privacy.cancel_no_token") : undefined} onClick={() => cancel.mutate()}>{t("profile.privacy.cancel_deletion")}</button></div>}
    <div className="section-subtitle">{t("profile.privacy.export_title")}</div><p className="section-desc">{t("profile.privacy.export_desc")}</p><a className="btn btn-ghost" href="/api/auth/me/export" download>{t("profile.privacy.export_btn")}</a>
    <div className="section-subtitle" style={{ marginTop: 32, color: "var(--danger,#e55)" }}>{t("profile.privacy.delete_title")}</div><p className="section-desc">{t("profile.privacy.delete_desc")}</p><button className="btn btn-danger" disabled={deletion.scheduled || request.isPending} onClick={() => { if (confirm(t("profile.privacy.confirm_request_deletion"))) request.mutate(); }}>{request.isPending ? t("profile.privacy.requesting") : t("profile.privacy.delete_btn")}</button>
    {(request.error || cancel.error) && <p className="form-error" role="alert">{errorText(request.error ?? cancel.error, t)}</p>}
  </>;
}

const plans = [
  { id: "free", nameKey: "profile.billing_page.plan_free_name", descKey: "profile.billing_page.plan_free_desc" },
  { id: "developer", nameKey: "profile.billing_page.plan_developer_name", descKey: "profile.billing_page.plan_developer_desc" },
  { id: "business", nameKey: "profile.billing_page.plan_business_name", descKey: "profile.billing_page.plan_business_desc" },
] as const;

const SUB_STATUS_KEY: Record<string, string> = {
  active: "profile.billing_page.status_active",
  trialing: "profile.billing_page.status_trialing",
  past_due: "profile.billing_page.status_past_due",
  incomplete: "profile.billing_page.status_incomplete",
  canceled: "profile.billing_page.status_canceled",
};

function planPrice(id: (typeof plans)[number]["id"], annual: boolean, t: TFunction): string {
  const base =
    id === "free"
      ? t("profile.billing_page.plan_free_price")
      : id === "developer"
        ? t("profile.billing_page.price_per_month", { price: "9 €" })
        : t("profile.billing_page.price_from_per_seat_month", { price: "7,50 €" });
  return annual && id !== "free" ? `${base}${t("profile.billing_page.annual_suffix")}` : base;
}

export function BillingSection({ initial, onReload }: { initial: BillingState | null; onReload: () => void }) {
  const { t } = useTranslation();
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
  const statusKey = initial?.status ? SUB_STATUS_KEY[initial.status] : undefined;
  return <>
    <div className="section-title">{t("profile.nav.billing")}</div><p className="section-desc">{current === "free" ? t("profile.billing_page.select_plan_desc") : t("profile.billing_page.manage_sub_desc")}</p>
    <div className="billing-plans-grid">{plans.map((plan) => <button type="button" className={`billing-plan-card${current === plan.id ? " billing-plan-card--current" : ""}${selected === plan.id ? " billing-plan-card--selected" : ""}`} key={plan.id} onClick={() => setSelected(plan.id === current ? null : plan.id)}>{current === plan.id && <span className="billing-plan-badge">{t("profile.billing_page.current_plan_badge")}</span>}<span className="billing-plan-name">{t(plan.nameKey)}</span><span className="billing-plan-price">{planPrice(plan.id, annual, t)}</span><span className="billing-plan-desc">{t(plan.descKey)}</span></button>)}</div>
    {selected && selected !== "free" && <div className="billing-interval-toggle"><button className={`billing-int-btn${!annual ? " active" : ""}`} onClick={() => setAnnual(false)}>{t("profile.billing_page.interval_monthly")}</button><button className={`billing-int-btn${annual ? " active" : ""}`} onClick={() => setAnnual(true)}>{t("profile.billing_page.interval_annual")} <span className="billing-int-save">{t("profile.billing_page.interval_annual_save")}</span></button></div>}
    {(selected === "business" || (!selected && current === "business")) && <div style={{ marginTop: 20 }}><div className="section-subtitle">{t("profile.billing_page.team_seats_title")}</div><div style={{ display: "flex", gap: 8 }}><input className="input" type="number" min={2} max={100} style={{ width: 90 }} value={seats} onChange={(event) => setSeats(Number(event.target.value))} />{!selected && <button className="btn btn-ghost btn-sm" disabled={action.isPending} onClick={() => action.mutate("seats")}>{t("profile.billing_page.update_seats_btn")}</button>}</div></div>}
    {selected && <div style={{ marginTop: 20, display: "flex", gap: 8 }}><button className="btn btn-primary" disabled={action.isPending} onClick={() => action.mutate("change")}>{action.isPending ? t("profile.billing_page.processing") : t("profile.billing_page.upgrade_to", { plan: t(plans.find((plan) => plan.id === selected)?.nameKey ?? selected ?? "") })}</button><button className="btn btn-ghost" onClick={() => setSelected(null)}>{t("profile.billing_page.cancel_selection_btn")}</button></div>}
    {initial?.status && current !== "free" && <div className="profile-info-block" style={{ marginTop: 20 }}><div className="profile-info-row"><span className="profile-info-label">{t("profile.billing_page.col_status")}</span><span className="profile-info-value">{statusKey ? t(statusKey) : initial.status}{initial.cancel_at_period_end ? t("profile.billing_page.cancels_at_period_end") : ""}</span></div><div className="profile-info-row"><span className="profile-info-label">{t("profile.billing_page.next_renewal_label")}</span><span className="profile-info-value">{initial.current_period_end ? new Date(initial.current_period_end).toLocaleDateString("es-ES") : "—"}</span></div></div>}
    {current !== "free" && <div style={{ marginTop: 20 }}>{initial?.cancel_at_period_end ? <button className="btn btn-ghost" disabled={action.isPending} onClick={() => action.mutate("reactivate")}>{t("profile.billing_page.reactivate_sub_btn")}</button> : <button className="btn btn-ghost action-item--danger" disabled={action.isPending} onClick={() => { if (confirm(t("profile.billing_page.confirm_cancel_sub"))) action.mutate("cancel"); }}>{t("profile.billing_page.cancel_sub_btn")}</button>}</div>}
    {current === "business" && <div style={{ marginTop: 28 }}><div className="section-subtitle">{t("profile.billing_page.assigned_licenses_title")}</div>{licenses.data && <p className="section-desc">{t("profile.billing_page.licenses_desc", { used: licenses.data.used, seats: licenses.data.seats, available: licenses.data.available })}</p>}<input className="admin-search" type="search" value={licenseSearch} onChange={(event) => setLicenseSearch(event.target.value)} placeholder={t("profile.billing_page.search_user_placeholder")} />{licenses.isPending ? <div className="admin-empty">{t("profile.billing_page.loading_licenses")}</div> : licenses.error ? <p className="form-error">{errorText(licenses.error, t)}</p> : <table className="admin-table"><thead><tr><th>{t("profile.billing_page.col_user")}</th><th>{t("profile.billing_page.col_status")}</th><th /></tr></thead><tbody>{shownUsers.map((user) => <tr key={user.username}><td>{user.email || user.username}</td><td><span className={`badge ${user.licensed ? "badge--ok" : "badge--warn"}`}>{user.licensed ? t("profile.billing_page.licensed_badge") : t("profile.billing_page.unlicensed_badge")}</span></td><td className="td-actions">{user.username === licenses.data?.owner ? <span className="badge badge--std">{t("profile.billing_page.owner_badge")}</span> : <button className={`btn ${user.licensed ? "btn-ghost" : "btn-primary"} btn-sm`} disabled={license.isPending || (!user.licensed && (licenses.data?.available ?? 0) <= 0)} onClick={() => license.mutate({ username: user.username, assign: !user.licensed })}>{user.licensed ? t("profile.billing_page.remove_license_btn") : t("profile.billing_page.assign_license_btn")}</button>}</td></tr>)}</tbody></table>}</div>}
    {(action.error || license.error) && <p className="form-error">{errorText(action.error ?? license.error, t)}</p>}
  </>;
}
