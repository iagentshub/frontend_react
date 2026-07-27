import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "@/api/client";
import { queryKeys } from "@/api/query-client";
import { Seo } from "@/components/seo";
import { usePublicNavigation } from "@/i18n/public-paths";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/pricing/pricing.css";

// ── Cálculo de precios — misma lógica que pricing.js (vanilla) ────────────
const DEV_PRICE = 9;
const BIZ_START = 7.5;
const FLOOR = DEV_PRICE * 0.5; // €4.50
const ENT_THRESHOLD = 100;
const SH_MONTHLY = 400;
const SH_ANNUAL = SH_MONTHLY * 10; // €4.000/año
const MONTHS_ANNUAL = 10;
const SLOPE = (BIZ_START - FLOOR) / (ENT_THRESHOLD - 1);

function fmt(num: number): string {
  const r = Math.round(num * 100) / 100;
  return "€" + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace(".", ","));
}
function fmtInt(num: number): string {
  return "€" + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function ppl(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return DEV_PRICE;
  return Math.max(FLOOR, BIZ_START - SLOPE * (n - 1));
}

type PlanKey = "free" | "rookie" | "developer" | "business" | "enterprise";
type Tier1 = "rookie" | "developer";

const PLANS: Record<
  PlanKey,
  { nameKey: string; benefits: string[]; supportKey: string; ctaType: string }
> = {
  free: {
    nameKey: "plan_free",
    benefits: ["svc_managed", "svc_updates"],
    supportKey: "svc_community",
    ctaType: "free",
  },
  rookie: {
    nameKey: "plan_starter",
    benefits: ["svc_managed", "svc_updates", "svc_groups", "svc_training_basic"],
    supportKey: "svc_community",
    ctaType: "free",
  },
  developer: {
    nameKey: "plan_dev",
    benefits: ["svc_managed", "svc_updates", "svc_groups", "svc_backups", "svc_training_mid"],
    supportKey: "svc_support_direct",
    ctaType: "plan_dev",
  },
  business: {
    nameKey: "plan_biz",
    benefits: [
      "svc_managed",
      "svc_updates",
      "svc_groups",
      "svc_backups",
      "svc_admin_panel",
      "svc_onboarding",
      "svc_discounts_training",
    ],
    supportKey: "svc_support_direct",
    ctaType: "plan_biz",
  },
  enterprise: {
    nameKey: "plan_ent",
    benefits: [
      "svc_managed",
      "svc_updates",
      "svc_groups",
      "svc_backups",
      "svc_admin_panel",
      "svc_onboarding",
      "svc_discounts_training",
    ],
    supportKey: "svc_support_direct",
    ctaType: "plan_ent",
  },
};

function planForN(n: number, tierAt1: Tier1): PlanKey {
  if (n <= 0) return "free";
  if (n === 1) return tierAt1;
  if (n <= ENT_THRESHOLD) return "business";
  return "enterprise";
}

const CARDS: Array<{
  id: "free" | "starter" | "dev" | "biz" | "ent";
  nameKey: string;
  targetKey: string;
  seatsKey?: string;
  descKey: string;
  features: string[];
  supportKey: string;
  supportHi: boolean;
  monthly?: string;
  annual?: string;
  perMonthKey?: string;
  perYearKey?: string;
  from?: boolean;
}> = [
  {
    id: "free",
    nameKey: "plan_free",
    targetKey: "target_free",
    descKey: "service_desc_free",
    features: ["svc_managed", "svc_updates"],
    supportKey: "svc_community",
    supportHi: false,
  },
  {
    id: "starter",
    nameKey: "plan_starter",
    targetKey: "target_starter",
    seatsKey: "seats_starter",
    descKey: "service_desc_starter",
    features: ["svc_prev_anon", "svc_groups", "svc_training_basic"],
    supportKey: "svc_community",
    supportHi: false,
  },
  {
    id: "dev",
    nameKey: "plan_dev",
    targetKey: "target_dev",
    seatsKey: "seats_dev",
    descKey: "service_desc_dev",
    features: ["svc_prev_starter", "svc_backups", "svc_training_mid"],
    supportKey: "svc_support_direct",
    supportHi: true,
    monthly: "€9",
    annual: "€90",
    perMonthKey: "per_month",
    perYearKey: "per_year",
  },
  {
    id: "biz",
    nameKey: "plan_biz",
    targetKey: "target_biz",
    seatsKey: "seats_biz",
    descKey: "service_desc_biz",
    features: ["svc_prev_dev", "svc_admin_panel", "svc_onboarding", "svc_discounts_training"],
    supportKey: "svc_support_direct",
    supportHi: true,
    monthly: "€6",
    annual: "€60",
    perMonthKey: "per_lic_month",
    perYearKey: "per_lic_year",
    from: true,
  },
  {
    id: "ent",
    nameKey: "plan_ent",
    targetKey: "target_ent",
    seatsKey: "seats_ent",
    descKey: "service_desc_ent",
    features: ["svc_prev_biz", "svc_discounts_training"],
    supportKey: "svc_support_direct",
    supportHi: true,
    monthly: "€4,50",
    annual: "€45",
    perMonthKey: "per_lic_month",
    perYearKey: "per_lic_year",
    from: true,
  },
];

export function PricingPage() {
  const { t, i18n } = useTranslation();
  useBodyClass("pricing-page");
  const { publicLink, language, switchLanguage } = usePublicNavigation(i18n, "/pricing/");
  const navigate = useNavigate();

  // ── Guard: si la facturación está desactivada, no se muestra la página ──
  const settings = useQuery({
    queryKey: queryKeys.platform,
    queryFn: ({ signal }) =>
      api.get<{ billing_enabled?: boolean }>("/api/settings/platform/public", signal, false),
  });

  // ── Toggle mensual/anual de la página ─────────────────────────────────
  const [annual, setAnnual] = useState(false);

  // ── Modal de calculadora de plan ──────────────────────────────────────
  const [pmOpen, setPmOpen] = useState(false);
  const [pmLicenses, setPmLicenses] = useState(1);
  const [pmTierAt1, setPmTierAt1] = useState<Tier1>("developer");
  const [pmAnnual, setPmAnnual] = useState(false);
  const [pmSelfHosted, setPmSelfHosted] = useState(false);
  const [pmInfoOpen, setPmInfoOpen] = useState(false);
  const [pmAnimClass, setPmAnimClass] = useState("");
  const prevPlanRef = useRef<PlanKey>("developer");

  const pmPlan = useMemo(() => planForN(pmLicenses, pmTierAt1), [pmLicenses, pmTierAt1]);

  useEffect(() => {
    if (prevPlanRef.current === pmPlan) return;
    prevPlanRef.current = pmPlan;
    setPmAnimClass("pm-card--exit");
    const enterTimer = setTimeout(() => setPmAnimClass("pm-card--enter"), 140);
    const clearTimer = setTimeout(() => setPmAnimClass(""), 360);
    return () => {
      clearTimeout(enterTimer);
      clearTimeout(clearTimer);
    };
  }, [pmPlan]);

  useEffect(() => {
    if (!pmInfoOpen) return;
    const close = () => setPmInfoOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [pmInfoOpen]);

  const isFreeState = pmLicenses <= 0 || pmPlan === "rookie";

  const zoneKey = pmPlan === "rookie" ? "developer" : pmPlan;

  const onZoneClick = (val: number) => {
    setPmLicenses(val);
    setPmTierAt1("developer");
  };

  const onSliderChange = (val: number) => {
    setPmLicenses(val);
    if (val !== 1) setPmTierAt1("developer");
  };

  // ── Modal de contacto ──────────────────────────────────────────────────
  const [contact, setContact] = useState<{ type: string; title: string } | null>(null);

  const ctaClick = () => {
    if (pmPlan === "free" || pmPlan === "rookie") {
      void navigate("/register/");
      return;
    }
    if (pmPlan === "developer" || pmPlan === "business") {
      const interval = pmAnnual ? "year" : "month";
      void navigate(
        `/checkout/?tier=${pmPlan}&seats=${pmLicenses}&interval=${interval}&selfHosted=${pmSelfHosted ? "1" : "0"}`,
      );
      return;
    }
    const data = PLANS[pmPlan];
    setPmOpen(false);
    setContact({ type: data.ctaType, title: t(`pricing.contact_title_${data.ctaType}`) });
  };

  const shCost = pmSelfHosted ? (pmAnnual ? SH_ANNUAL / MONTHS_ANNUAL : SH_MONTHLY) : 0;
  const pricePerLic = ppl(pmLicenses);
  const monthlyBase = pmLicenses * pricePerLic;
  const monthlyTotal = monthlyBase + shCost;
  const annualBase = monthlyBase * MONTHS_ANNUAL;
  const annualSh = pmSelfHosted ? SH_ANNUAL : 0;
  const annualTotal = annualBase + annualSh;
  const saving = monthlyTotal * 12 - annualTotal;

  if (settings.data && settings.data.billing_enabled === false) return <Navigate to="/" replace />;

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
          iAgents<span>Hub</span>
        </Link>

        <div className="pr-header-divider" />

        <span className="pr-header-label">{t("pricing.badge")}</span>

        <div className="pr-header-spacer" />

        <Link to={publicLink("/about")} className="pr-header-link">
          {t("pricing.nav_about")}
        </Link>

        <Link to="/login/" className="pr-header-link">
          {t("pricing.nav_login")}
        </Link>

        <Link to="/register/" className="pr-header-cta">
          {t("pricing.nav_cta")}
        </Link>
      </header>

      <main className="pr-main">
        <div className="pr-hero">
          <div className="pr-hero-badge">{t("pricing.badge")}</div>

          <h1 className="pr-hero-title">{t("pricing.title")}</h1>

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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path
              d="M5.5 10.5c.5-1.5 2.5-3 2.5-4.5a2 2 0 1 0-4 0"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle cx="8" cy="13" r=".8" fill="currentColor" />
          </svg>

          <div className="pr-oss-body">
            <strong>{t("pricing.oss_title")}</strong>
            <span>{t("pricing.oss_desc")}</span>
          </div>

          <a
            href="https://github.com/iagentshub"
            target="_blank"
            rel="noopener"
            className="pr-oss-cta"
          >
            {t("pricing.oss_cta")}
          </a>
        </div>

        <div className="pr-grid">
          {CARDS.map((card) => (
            <div className="pr-card" key={card.id}>
              <div className="pr-card-head">
                <div className="pr-plan-name">{t(`pricing.${card.nameKey}`)}</div>

                <div className="pr-plan-target">{t(`pricing.${card.targetKey}`)}</div>

                {card.monthly ? (
                  <>
                    <div className="pr-price-wrap pr-price-monthly" hidden={annual}>
                      {card.from && (
                        <span className="pr-price-from">{t("pricing.price_from")}</span>
                      )}
                      <span className="pr-price">{card.monthly}</span>
                      <span className="pr-price-period">{t(`pricing.${card.perMonthKey}`)}</span>
                    </div>

                    <div className="pr-price-wrap pr-price-annual" hidden={!annual}>
                      {card.from && (
                        <span className="pr-price-from">{t("pricing.price_from")}</span>
                      )}
                      <span className="pr-price">{card.annual}</span>
                      <span className="pr-price-period">{t(`pricing.${card.perYearKey}`)}</span>
                    </div>
                  </>
                ) : (
                  <div className="pr-price-wrap">
                    <span className="pr-price">{t("pricing.price_free")}</span>
                  </div>
                )}

                {card.seatsKey && <div className="pr-seats">{t(`pricing.${card.seatsKey}`)}</div>}
              </div>

              <p className="pr-service-desc">{t(`pricing.${card.descKey}`)}</p>

              <div className="pr-service">
                <div className="pr-service-label">{t("pricing.service_label")}</div>

                <ul className="pr-service-list">
                  {card.features.map((featureKey) => (
                    <li
                      className={featureKey.startsWith("svc_prev_") ? "pr-service-prev" : undefined}
                      key={featureKey}
                    >
                      {t(`pricing.${featureKey}`)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pr-support-row">
                <span className="pr-support-label">{t("pricing.support_label")}</span>

                <div className="pr-support-tags">
                  <span className={`pr-support-tag${card.supportHi ? " pr-support-tag--hi" : ""}`}>
                    {t(`pricing.${card.supportKey}`)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pr-extras">
          <div className="pr-extra-item">
            <div className="pr-extra-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="1" y="3" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <rect x="1" y="10" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <circle cx="14" cy="5" r="1" fill="currentColor" />
                <circle cx="14" cy="12" r="1" fill="currentColor" />
              </svg>
            </div>

            <div className="pr-extra-body">
              <div className="pr-extra-name">{t("pricing.extra_sh_name")}</div>
              <div className="pr-extra-desc">{t("pricing.extra_sh_desc")}</div>
            </div>
          </div>

          <div className="pr-extra-sep" />

          <div className="pr-extra-item">
            <div className="pr-extra-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M9 1.5L11 6h5l-4 3 1.5 5L9 11.5 4.5 14 6 9 2 6h5z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="pr-extra-body">
              <div className="pr-extra-name">{t("pricing.extra_training_name")}</div>
              <div className="pr-extra-desc">{t("pricing.extra_training_desc")}</div>
            </div>
          </div>

          <div className="pr-extra-sep" />

          <div className="pr-extra-item">
            <div className="pr-extra-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="pr-extra-body">
              <div className="pr-extra-name">{t("pricing.extra_consulting_name")}</div>
              <div className="pr-extra-desc">{t("pricing.extra_consulting_desc")}</div>
            </div>
          </div>
        </div>

        <div className="pr-open-plan-wrap">
          <button type="button" className="pr-btn pr-open-plan-btn" onClick={() => setPmOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>{t("pricing.pm_open_btn")}</span>
          </button>
        </div>

        <div className="pr-byok">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10.5 1a4.5 4.5 0 0 0-4.27 5.9L1.5 11.6V14h2.4l.5-.5v-1h1v-1h1l1.1-1.1A4.5 4.5 0 1 0 10.5 1zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"
              fill="currentColor"
            />
          </svg>
          <span dangerouslySetInnerHTML={{ __html: t("pricing.byok_note") }} />
        </div>

        <section className="pr-faq">
          <h2 className="pr-faq-title">{t("pricing.faq_title")}</h2>

          <div className="pr-faq-list">
            {(["faq1", "faq2", "faq3", "faq4", "faq5"] as const).map((faq) => (
              <details className="pr-faq-item" key={faq}>
                <summary className="pr-faq-q">{t(`pricing.${faq}_q`)}</summary>
                <p className="pr-faq-a">{t(`pricing.${faq}_a`)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      {pmOpen && (
        <div
          className="pm-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pm-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPmOpen(false);
          }}
        >
          <div className="pm-dialog">
            <div className="pm-header">
              <div className="pm-header-text">
                <div className="pm-title" id="pm-title">
                  {t("pricing.pm_title")}
                </div>
                <div className="pm-subtitle">{t("pricing.pm_subtitle")}</div>
              </div>

              <button className="pm-close" aria-label="Cerrar" onClick={() => setPmOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="pm-slider-section">
              <div className="pm-slider-row">
                <input
                  type="range"
                  className="pm-slider-input"
                  min={1}
                  max={500}
                  step={1}
                  value={pmLicenses}
                  onChange={(event) => onSliderChange(parseInt(event.target.value, 10))}
                />

                <div className="pm-count-wrap">
                  <span className="pm-count-num">{pmLicenses >= 500 ? "500+" : pmLicenses}</span>
                  <span className="pm-count-label">{t("pricing.calc_licenses")}</span>
                </div>
              </div>

              <div className="pm-zones">
                <button
                  className={`pm-zone${zoneKey === "developer" ? " active" : ""}`}
                  onClick={() => onZoneClick(1)}
                >
                  {t("pricing.plan_dev")}
                </button>

                <button
                  className={`pm-zone${zoneKey === "business" ? " active" : ""}`}
                  onClick={() => onZoneClick(25)}
                >
                  {t("pricing.plan_biz")}
                </button>

                <button
                  className={`pm-zone${zoneKey === "enterprise" ? " active" : ""}`}
                  onClick={() => onZoneClick(150)}
                >
                  {t("pricing.plan_ent")}
                </button>
              </div>

              {pmLicenses === 1 && (
                <div className="pm-tier-toggle">
                  <button
                    type="button"
                    className={`pm-tier-btn${pmTierAt1 === "rookie" ? " pm-tier-btn--active" : ""}`}
                    onClick={() => setPmTierAt1("rookie")}
                  >
                    <span>{t("pricing.plan_starter")}</span>
                    <span className="pm-tier-price">{t("pricing.price_free")}</span>
                  </button>

                  <button
                    type="button"
                    className={`pm-tier-btn${pmTierAt1 === "developer" ? " pm-tier-btn--active" : ""}`}
                    onClick={() => setPmTierAt1("developer")}
                  >
                    <span>{t("pricing.plan_dev")}</span>
                    <span className="pm-tier-price">€9/mes</span>
                  </button>
                </div>
              )}
            </div>

            <div className="pm-body">
              <div className="pm-left">
                <div className={`pm-card ${pmAnimClass}`}>
                  <div className="pm-badge">{t("pricing.pm_recommended")}</div>
                  <div className="pm-plan-name">{t(`pricing.${PLANS[pmPlan].nameKey}`)}</div>

                  <ul className="pm-benefits">
                    {PLANS[pmPlan].benefits.map((benefitKey) => (
                      <li key={benefitKey}>{t(`pricing.${benefitKey}`)}</li>
                    ))}
                    <li className="pm-benefit-support">{t(`pricing.${PLANS[pmPlan].supportKey}`)}</li>
                  </ul>
                </div>
              </div>

              <div className="pm-right">
                <div className="pm-billing-wrap">
                  <span className="pm-billing-label">{t("pricing.calc_billing")}</span>

                  <div className="pm-billing-toggle">
                    <button
                      className={`pm-tbtn${!pmAnnual ? " active" : ""}`}
                      onClick={() => setPmAnnual(false)}
                    >
                      {t("pricing.toggle_monthly")}
                    </button>

                    <button
                      className={`pm-tbtn${pmAnnual ? " active" : ""}`}
                      onClick={() => setPmAnnual(true)}
                    >
                      {t("pricing.toggle_annual")}
                    </button>
                  </div>
                </div>

                <div className="pm-sh-row">
                  <label className="pm-sh-wrap">
                    <input
                      type="checkbox"
                      className="pr-calc-check"
                      checked={!isFreeState && pmSelfHosted}
                      disabled={isFreeState}
                      onChange={(event) => setPmSelfHosted(event.target.checked)}
                    />
                    <span className="pr-calc-check-box" />
                    <span className="pm-sh-text">
                      <span>{t("pricing.calc_sh_label")}</span>
                      <span className="pr-calc-sh-note">
                        {!isFreeState && t(pmAnnual ? "pricing.calc_sh_annual" : "pricing.calc_sh_monthly")}
                      </span>
                    </span>
                  </label>

                  <button
                    type="button"
                    className={`pm-info-btn${pmInfoOpen ? " open" : ""}`}
                    aria-label={t("pricing.calc_sh_info")}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPmInfoOpen((value) => !value);
                    }}
                  >
                    i
                    <div className="pm-info-tooltip">{t("pricing.calc_sh_info")}</div>
                  </button>
                </div>

                <div className="pm-divider" />

                <div className="pm-price-block">
                  <div className="pm-ppl">
                    {!isFreeState && `${fmt(pricePerLic)} / ${t("pricing.calc_per_lic")}`}
                  </div>

                  <div className="pm-total-monthly">
                    <span className="pm-total-num">
                      {isFreeState ? t("pricing.price_free") : fmtInt(monthlyTotal)}
                    </span>
                    {!isFreeState && <span className="pm-total-period">{t("pricing.calc_month")}</span>}
                  </div>

                  {!isFreeState && pmAnnual && (
                    <div className="pm-total-annual">
                      <span className="pm-total-annual-num">{fmtInt(annualTotal)}</span>
                      <span className="pm-total-period">{t("pricing.calc_year")}</span>
                    </div>
                  )}

                  <div className="pm-savings">
                    {!isFreeState &&
                      pmAnnual &&
                      t("pricing.calc_free_months") +
                        (saving > 0 ? ` (${t("pricing.calc_saving_of")} ${fmtInt(saving)})` : "")}
                  </div>

                  {!isFreeState && <div className="pm-vat-note">{t("pricing.vat_note")}</div>}
                </div>

                <button type="button" className="pr-btn pm-cta" onClick={ctaClick}>
                  {isFreeState
                    ? t("pricing.pm_cta_free")
                    : `${t("pricing.pm_cta")} ${t(`pricing.${PLANS[pmPlan].nameKey}`)}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contact && (
        <ContactModal type={contact.type} title={contact.title} onClose={() => setContact(null)} />
      )}

      <footer className="pr-footer">
        <span>© 2026 iAgentsHub</span>
        <Link to={publicLink("/about")}>{t("pricing.footer_about")}</Link>
        <a href="mailto:hola@iagentshub.com">{t("pricing.footer_contact")}</a>
        <button className="pr-lang-btn" type="button" onClick={() => void switchLanguage()}>
          {language.toUpperCase()}
        </button>
      </footer>
    </>
  );
}

function ContactModal({
  type,
  title,
  onClose,
}: {
  type: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: () =>
      api.post("/api/admin/contact-requests", {
        type,
        label: "solicitud_formacion",
        name,
        email,
        message,
      }),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    send.mutate();
  };
  return (
    <div
      className="pr-modal-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="pr-modal">
        <button className="pr-modal-close" aria-label="Cerrar" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

        <div className="pr-modal-title">{title}</div>
        <div className="pr-modal-subtitle" />

        <form className="pr-modal-form" onSubmit={submit}>
          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-name">
              {t("pricing.contact_name")}
            </label>
            <input
              className="pr-modal-input"
              type="text"
              id="modal-name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-email">
              {t("pricing.contact_email")}
            </label>
            <input
              className="pr-modal-input"
              type="email"
              id="modal-email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="pr-modal-field">
            <label className="pr-modal-label" htmlFor="modal-message">
              {t("pricing.contact_message")}
            </label>
            <textarea
              className="pr-modal-input pr-modal-textarea"
              id="modal-message"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {send.isSuccess && (
            <div className="pr-modal-status pr-modal-status--ok">{t("pricing.contact_success")}</div>
          )}
          {send.isError && (
            <div className="pr-modal-status pr-modal-status--err">
              {send.error instanceof ApiError ? send.error.message : t("pricing.contact_error")}
            </div>
          )}

          <button type="submit" className="pr-btn" disabled={send.isPending}>
            {t("pricing.contact_send")}
          </button>
        </form>
      </div>
    </div>
  );
}
