import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import type { BillingState, DeletionStatus, LicenseState } from "./types";

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : i18n.t("common.errors.operation");
}

export function PrivacySection({
  deletion,
  onReload,
}: {
  deletion: DeletionStatus;
  onReload: () => void;
}) {
  const { t } = useTranslation();
  const token = new URLSearchParams(location.search).get("deletion_token") ?? "";
  const request = useMutation({
    mutationFn: () => api.post("/api/auth/me/request-deletion", {}),
    onSuccess: onReload,
  });
  const cancel = useMutation({
    mutationFn: () => api.post("/api/auth/me/cancel-deletion", { token }),
    onSuccess: onReload,
  });
  return (
    <>
      <div className="section-title">{t("profile.nav.privacy")}</div>

      {deletion.scheduled && (
        <div
          style={{
            marginBottom: 24,
            padding: "14px 16px",
            borderRadius: 8,
            border: "1px solid var(--danger,#e55)",
            background: "color-mix(in srgb,var(--danger,#e55) 10%,transparent)",
          }}
        >
          <div style={{ fontWeight: 600, color: "var(--danger,#e55)" }}>
            {t("profile.privacy.deletion_scheduled_title")}
          </div>
          <p className="section-desc">
            {t("legacy.text_44062009eac9")}{" "}
            {deletion.deletion_date
              ? new Date(deletion.deletion_date).toLocaleDateString(
                  i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES",
                )
              : ""}
            {t("legacy.text_b9ed91ac4ab5")}
          </p>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!token || cancel.isPending}
            title={!token ? "Usa el enlace recibido por email" : undefined}
            onClick={() => cancel.mutate()}
          >
            {t("profile.privacy.cancel_deletion")}
          </button>
        </div>
      )}

      <div className="section-subtitle">{t("profile.privacy.export_title")}</div>
      <p className="section-desc">{t("legacy.text_5e5a87de4303")}</p>
      <a className="btn btn-ghost" href="/api/auth/me/export" download>
        {t("profile.privacy.export_title")}
      </a>

      <div className="section-subtitle" style={{ marginTop: 32, color: "var(--danger,#e55)" }}>
        {t("profile.privacy.delete_title")}
      </div>
      <p className="section-desc">{t("legacy.text_ed7efd0ae1da")}</p>
      <button
        className="btn btn-danger"
        disabled={deletion.scheduled || request.isPending}
        onClick={() => {
          if (confirm(i18n.t("dynamic.text_1c531b13e159"))) request.mutate();
        }}
      >
        {request.isPending ? "Solicitando…" : i18n.t("dynamic.text_c5f8f2bc0885")}
      </button>

      {(request.error || cancel.error) && (
        <p className="form-error" role="alert">
          {errorText(request.error ?? cancel.error)}
        </p>
      )}
    </>
  );
}

const plans = [
  {
    id: "free",
    nameKey: "pricing.plan_starter",
    monthlyPriceKey: "profile.billing.plan_free_price",
    annualPriceKey: "profile.billing.plan_free_price",
    descriptionKey: "pricing.service_desc_starter",
  },
  {
    id: "developer",
    nameKey: "pricing.plan_dev",
    monthlyPriceKey: "profile.billing.plan_dev_monthly",
    annualPriceKey: "profile.billing.plan_dev_annual",
    descriptionKey: "pricing.service_desc_dev",
  },
  {
    id: "business",
    nameKey: "pricing.plan_biz",
    monthlyPriceKey: "profile.billing.plan_business_monthly",
    annualPriceKey: "profile.billing.plan_business_annual",
    descriptionKey: "pricing.service_desc_biz",
  },
] as const;

export function BillingSection({
  initial,
  onReload,
}: {
  initial: BillingState | null;
  onReload: () => void;
}) {
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
      return api.post("/api/billing/subscribe", {
        tier: selected,
        seats: selected === "business" ? Math.max(2, seats) : 1,
        interval: annual ? "year" : "month",
        self_hosted: false,
      });
    },
    onSuccess: () => {
      setSelected(null);
      onReload();
    },
  });
  const licenses = useQuery({
    queryKey: ["profile", "licenses", current],
    queryFn: ({ signal }) => api.get<LicenseState>("/api/billing/licenses", signal),
    enabled: current === "business",
  });
  const license = useMutation({
    mutationFn: ({ username, assign }: { username: string; assign: boolean }) =>
      assign
        ? api.post<LicenseState>(`/api/billing/licenses/${encodeURIComponent(username)}`, {})
        : api.delete<LicenseState>(`/api/billing/licenses/${encodeURIComponent(username)}`),
    onSuccess: () => licenses.refetch(),
  });
  const [licenseSearch, setLicenseSearch] = useState("");
  const shownUsers = useMemo(
    () =>
      (licenses.data?.users ?? []).filter(
        (user) =>
          !licenseSearch ||
          `${user.username} ${user.email ?? ""}`
            .toLowerCase()
            .includes(licenseSearch.toLowerCase()),
      ),
    [licenses.data, licenseSearch],
  );
  return (
    <>
      <div className="section-title">{t("errors.resources.subscription")}</div>
      <p className="section-desc">
        {current === "free"
          ? t("profile.billing.select_plan")
          : i18n.t("dynamic.text_ecb147410498")}
      </p>

      <div className="billing-plans-grid">
        {plans.map((plan) => (
          <button
            type="button"
            className={`billing-plan-card${current === plan.id ? " billing-plan-card--current" : ""}${selected === plan.id ? " billing-plan-card--selected" : ""}`}
            key={plan.id}
            onClick={() => setSelected(plan.id === current ? null : plan.id)}
          >
            {current === plan.id && (
              <span className="billing-plan-badge">{t("legacy.text_c101ee85a3df")}</span>
            )}
            <span className="billing-plan-name">{t(plan.nameKey)}</span>
            <span className="billing-plan-price">
              {t(annual ? plan.annualPriceKey : plan.monthlyPriceKey)}
            </span>
            <span className="billing-plan-desc">{t(plan.descriptionKey)}</span>
          </button>
        ))}
      </div>

      {selected && selected !== "free" && (
        <div className="billing-interval-toggle">
          <button
            className={`billing-int-btn${!annual ? " active" : ""}`}
            onClick={() => setAnnual(false)}
          >
            {t("pricing.toggle_monthly")}
          </button>
          <button
            className={`billing-int-btn${annual ? " active" : ""}`}
            onClick={() => setAnnual(true)}
          >
            {t("pricing.toggle_annual")}
            <span className="billing-int-save">{t("pricing.toggle_badge")}</span>
          </button>
        </div>
      )}

      {(selected === "business" || (!selected && current === "business")) && (
        <div style={{ marginTop: 20 }}>
          <div className="section-subtitle">{t("legacy.text_6afebcf6d604")}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              type="number"
              min={2}
              max={100}
              style={{ width: 90 }}
              value={seats}
              onChange={(event) => setSeats(Number(event.target.value))}
            />
            {!selected && (
              <button
                className="btn btn-ghost btn-sm"
                disabled={action.isPending}
                onClick={() => action.mutate("seats")}
              >
                {t("legacy.text_00268e9e1948")}
              </button>
            )}
          </div>
        </div>
      )}

      {selected && (
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button
            className="btn btn-primary"
            disabled={action.isPending}
            onClick={() => action.mutate("change")}
          >
            {action.isPending
              ? t("profile.billing.processing")
              : t("profile.billing.update_to", {
                  plan: t(plans.find((plan) => plan.id === selected)?.nameKey ?? selected),
                })}
          </button>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>
            {t("agents.scan.folder_cancel_btn")}
          </button>
        </div>
      )}

      {initial?.status && current !== "free" && (
        <div className="profile-info-block" style={{ marginTop: 20 }}>
          <div className="profile-info-row">
            <span className="profile-info-label">{t("agents.blueprint.status")}</span>
            <span className="profile-info-value">
              {initial.status}
              {initial.cancel_at_period_end ? " (se cancela al final del periodo)" : ""}
            </span>
          </div>
          <div className="profile-info-row">
            <span className="profile-info-label">{t("legacy.text_1cb2fe757b48")}</span>
            <span className="profile-info-value">
              {initial.current_period_end
                ? new Date(initial.current_period_end).toLocaleDateString(
                    i18n.resolvedLanguage === "en" ? "en-GB" : "es-ES",
                  )
                : "—"}
            </span>
          </div>
        </div>
      )}

      {current !== "free" && (
        <div style={{ marginTop: 20 }}>
          {initial?.cancel_at_period_end ? (
            <button
              className="btn btn-ghost"
              disabled={action.isPending}
              onClick={() => action.mutate("reactivate")}
            >
              {t("legacy.text_0c7137521718")}
            </button>
          ) : (
            <button
              className="btn btn-ghost action-item--danger"
              disabled={action.isPending}
              onClick={() => {
                if (confirm(i18n.t("dynamic.text_969ad0427516"))) action.mutate("cancel");
              }}
            >
              {t("legacy.text_101ea751d58a")}
            </button>
          )}
        </div>
      )}

      {current === "business" && (
        <div style={{ marginTop: 28 }}>
          <div className="section-subtitle">{t("legacy.text_0665893319c1")}</div>
          {licenses.data && (
            <p className="section-desc">
              {licenses.data.used} {t("legacy.text_600ccd1b7156")}
              {licenses.data.seats} {t("legacy.text_ac9f909f60a1")} {licenses.data.available}.
            </p>
          )}
          <input
            className="admin-search"
            type="search"
            value={licenseSearch}
            onChange={(event) => setLicenseSearch(event.target.value)}
            placeholder={t("legacy.text_a865c5cf5c47")}
          />
          {licenses.isPending ? (
            <div className="admin-empty">{t("legacy.text_b0801688e9dd")}</div>
          ) : licenses.error ? (
            <p className="form-error">{errorText(licenses.error)}</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("admin.table.user")}</th>
                  <th>{t("agents.blueprint.status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shownUsers.map((user) => (
                  <tr key={user.username}>
                    <td>{user.email || user.username}</td>
                    <td>
                      <span className={`badge ${user.licensed ? "badge--ok" : "badge--warn"}`}>
                        {t(
                          user.licensed ? "profile.billing.licensed" : "profile.billing.unlicensed",
                        )}
                      </span>
                    </td>
                    <td className="td-actions">
                      {user.username === licenses.data?.owner ? (
                        <span className="badge badge--std">{t("legacy.text_958239c13d09")}</span>
                      ) : (
                        <button
                          className={`btn ${user.licensed ? "btn-ghost" : "btn-primary"} btn-sm`}
                          disabled={
                            license.isPending ||
                            (!user.licensed && (licenses.data?.available ?? 0) <= 0)
                          }
                          onClick={() =>
                            license.mutate({ username: user.username, assign: !user.licensed })
                          }
                        >
                          {user.licensed ? "Quitar" : "Asignar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(action.error || license.error) && (
        <p className="form-error">{errorText(action.error ?? license.error)}</p>
      )}
    </>
  );
}
