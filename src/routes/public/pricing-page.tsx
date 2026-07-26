import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { Seo } from "@/components/seo";
import { usePublicNavigation } from "@/i18n/public-paths";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/pricing/pricing.css";

const plans = [
  {
    id: "free",
    nameKey: "pricing.plan_free",
    targetKey: "pricing.target_free",
    monthly: 0,
    annual: 0,
    seatsKey: "pricing.seats_free",
    descriptionKey: "pricing.service_desc_free",
    featureKeys: ["pricing.svc_managed", "pricing.svc_updates", "pricing.svc_community"],
  },
  {
    id: "starter",
    nameKey: "pricing.plan_starter",
    targetKey: "pricing.target_starter",
    monthly: 0,
    annual: 0,
    seatsKey: "pricing.seats_starter",
    descriptionKey: "pricing.service_desc_starter",
    featureKeys: ["pricing.svc_prev_anon", "pricing.svc_groups", "pricing.svc_training_basic"],
  },
  {
    id: "developer",
    nameKey: "pricing.plan_dev",
    targetKey: "pricing.target_dev",
    monthly: 9,
    annual: 90,
    seatsKey: "pricing.seats_dev",
    descriptionKey: "pricing.service_desc_dev",
    featureKeys: ["pricing.svc_prev_starter", "pricing.svc_backups", "pricing.svc_support_direct"],
  },
  {
    id: "business",
    nameKey: "pricing.plan_biz",
    targetKey: "pricing.target_biz",
    monthly: 6,
    annual: 60,
    seatsKey: "pricing.seats_biz",
    descriptionKey: "pricing.service_desc_biz",
    featureKeys: [
      "pricing.svc_admin_panel",
      "pricing.svc_onboarding",
      "pricing.svc_discounts_training",
    ],
  },
];
function euro(value: number) {
  return new Intl.NumberFormat(i18n.resolvedLanguage === "en" ? "en-IE" : "es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PricingPage() {
  const { t, i18n } = useTranslation();
  useBodyClass("pricing-page");
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, "/pricing/");
  const navigate = useNavigate(),
    [annual, setAnnual] = useState(false),
    [calculator, setCalculator] = useState(false),
    [tier, setTier] = useState<"developer" | "business">("developer"),
    [seats, setSeats] = useState(5),
    [selfHosted, setSelfHosted] = useState(false),
    [contact, setContact] = useState(false);
  useEffect(() => {
    document.body.style.visibility = "";
  }, []);
  const amount = useMemo(() => {
    if (tier === "developer") return annual ? 90 : 9;
    const unit = seats >= 50 ? 6 : seats >= 20 ? 7 : 8;
    return unit * seats * (annual ? 10 : 1) + (selfHosted ? 0 : 0);
  }, [tier, seats, annual, selfHosted]);
  const checkout = () =>
    void navigate(
      `/checkout/?tier=${tier}&seats=${tier === "developer" ? 1 : seats}&interval=${annual ? "year" : "month"}&selfHosted=${selfHosted ? 1 : 0}`,
    );
  return (
    <>
      <Seo
        title={t("seo.pricing.title")}
        description={t("seo.pricing.description")}
        path="/pricing/"
        localizedPath="/pricing/"
      />

      <header className="pr-header">
        <Link className="pr-logo" to={publicLink("/")}>
          {t("legacy.text_1fda9fc57a04")}
          <span>{t("legacy.text_a38df5fc50fb")}</span>
        </Link>

        <div className="pr-header-divider" />

        <span className="pr-header-label">{t("auth.pricing_link")}</span>

        <div className="pr-header-spacer" />

        <button className="pr-header-link" type="button" onClick={() => void switchLanguage()}>
          {language.toUpperCase()}
        </button>

        <Link to={publicLink("/about")} className="pr-header-link">
          {t("about.page.title")}
        </Link>

        <Link to="/login/" className="pr-header-link">
          {t("about.header.login")}
        </Link>

        <Link to="/register/" className="pr-header-cta">
          {t("pricing.nav_cta")}
        </Link>
      </header>

      <main className="pr-main">
        <div className="pr-hero">
          <div className="pr-hero-badge">{t("auth.pricing_link")}</div>

          <h1 className="pr-hero-title">
            {t("legacy.text_71a3e5837ac1")}
            <br />
            {t("legacy.text_3b982774e2a2")}
          </h1>

          <p className="pr-hero-subtitle">{t("pricing.subtitle")}</p>

          <div className="pr-toggle">
            <button
              className={`pr-toggle-btn${!annual ? " active" : ""}`}
              onClick={() => setAnnual(false)}
            >
              {t("pricing.toggle_monthly")}
            </button>

            <button
              className={`pr-toggle-btn${annual ? " active" : ""}`}
              onClick={() => setAnnual(true)}
            >
              {t("pricing.toggle_annual")}
              <span className="pr-toggle-badge">{t("pricing.toggle_badge")}</span>
            </button>
          </div>
        </div>

        <div className="pr-oss">
          <span aria-hidden="true">◉</span>

          <div className="pr-oss-body">
            <strong>{t("pricing.oss_title")}</strong>

            <span>{t("legacy.text_68a4ca602c78")}</span>
          </div>

          <a
            href="https://github.com/iagentshub/iAgents"
            target="_blank"
            rel="noreferrer"
            className="pr-oss-cta"
          >
            {t("pricing.oss_cta")}
          </a>
        </div>

        <div className="pr-grid">
          {plans.map((plan) => (
            <article className="pr-card" key={plan.id}>
              <div className="pr-card-head">
                <div className="pr-plan-name">{t(plan.nameKey)}</div>

                <div className="pr-plan-target">{t(plan.targetKey)}</div>

                <div className="pr-price-wrap">
                  <span className="pr-price">
                    {plan.monthly === 0 ? "Gratis" : euro(annual ? plan.annual : plan.monthly)}
                  </span>

                  {plan.monthly > 0 && (
                    <span className="pr-price-period">
                      / {annual ? i18n.t("dynamic.text_8470d9e5f751") : "mes"}
                    </span>
                  )}
                </div>

                <div className="pr-seats">{t(plan.seatsKey)}</div>
              </div>

              <p className="pr-service-desc">{t(plan.descriptionKey)}</p>

              <div className="pr-service">
                <div className="pr-service-label">{t("pricing.service_label")}</div>

                <ul className="pr-service-list">
                  {plan.featureKeys.map((featureKey) => (
                    <li key={featureKey}>{t(featureKey)}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        <div className="pr-actions">
          <button id="open-plan-modal" className="pr-btn" onClick={() => setCalculator(true)}>
            {t("legacy.text_291f5aca36d6")}
          </button>

          <button className="pr-btn pr-btn--ghost" onClick={() => setContact(true)}>
            {t("legacy.text_08d6afdadab2")}
          </button>
        </div>
      </main>

      {calculator && (
        <div
          className="modal-bg"
          role="dialog"
          aria-modal="true"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCalculator(false);
          }}
        >
          <div className="modal-box pr-plan-modal">
            <div className="modal-header">
              <span className="modal-title">{t("legacy.text_b2063e988212")}</span>

              <button className="modal-close" onClick={() => setCalculator(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="pr-toggle">
                <button
                  className={`pr-toggle-btn${tier === "developer" ? " active" : ""}`}
                  onClick={() => setTier("developer")}
                >
                  {t("legacy.text_a7abed83ed9e")}
                </button>

                <button
                  className={`pr-toggle-btn${tier === "business" ? " active" : ""}`}
                  onClick={() => setTier("business")}
                >
                  {t("legacy.text_d6663dda5fe9")}
                </button>
              </div>

              {tier === "business" && (
                <div className="field">
                  <label htmlFor="plan-seats">
                    {t("legacy.text_411771b2f5da")}
                    {seats}
                  </label>

                  <input
                    id="plan-seats"
                    type="range"
                    min="2"
                    max="100"
                    value={seats}
                    onChange={(event) => setSeats(Number(event.target.value))}
                  />
                </div>
              )}

              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={selfHosted}
                  onChange={(event) => setSelfHosted(event.target.checked)}
                />
                <span className="toggle-track" />
                {t("legacy.text_5b5c27b7d963")}
              </label>

              <div className="co-summary-total">
                <span>{euro(amount)}</span>

                <span>/ {annual ? i18n.t("dynamic.text_8470d9e5f751") : "mes"}</span>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setCalculator(false)}>
                {t("agents.scan.folder_cancel_btn")}
              </button>

              <button className="btn btn-primary" onClick={checkout}>
                {t("legacy.text_4da14ab3af4d")}
              </button>
            </div>
          </div>
        </div>
      )}

      {contact && <ContactModal onClose={() => setContact(false)} />}
    </>
  );
}

function ContactModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () =>
      api.post("/api/admin/contact-requests", {
        type: "consulting",
        label: "solicitud_formacion",
        name,
        email,
        message,
      }),
    onSuccess: onClose,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };
  return (
    <div className="modal-bg" role="dialog" aria-modal="true">
      <div className="modal-box">
        <div className="modal-header">
          <span className="modal-title">{t("legacy.text_6cc23a3bdeed")}</span>

          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="field">
              <label>{t("agents.modal.field_name")}</label>

              <input required value={name} onChange={(event) => setName(event.target.value)} />
            </div>

            <div className="field">
              <label>{t("admin.table.email")}</label>

              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label>{t("admin.logs.col_message")}</label>

              <textarea
                required
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>

            {send.error && (
              <div className="form-error">
                {send.error instanceof ApiError ? send.error.message : t("common.errors.send")}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("agents.scan.folder_cancel_btn")}
            </button>

            <button className="btn btn-primary" disabled={send.isPending}>
              {t("common.actions.send")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
