import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { useQuery } from "@tanstack/react-query";
import { platformQuery } from "@/api/public-queries";
import { Seo } from "@/components/seo";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicShell, Reveal } from "@/components/public-motion";
import { useBodyClass } from "./use-body-class";
import { PLANS } from "./pricing-model";
import { usePriceMatrix } from "./use-price-matrix";
import { PriceMatrixModal } from "./price-matrix-modal";
import { PricingContactModal } from "./pricing-contact-modal";
import "@/styles/routes/pricing/pricing.css";

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
  /** Plan destacado. Cinco columnas idénticas no orientan a nadie. */
  featured?: boolean;
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
    featured: true,
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
  const { t } = useTranslation();
  useBodyClass("pricing-page");
  // ── Guard: si la facturación está desactivada, no se muestra la página ──
  const settings = useQuery(platformQuery);

  // ── Toggle mensual/anual de la página ─────────────────────────────────
  const [annual, setAnnual] = useState(false);

  // ── Modal de calculadora de plan ──────────────────────────────────────
  const matrix = usePriceMatrix();

  // ── Modal de contacto ──────────────────────────────────────────────────
  const [contact, setContact] = useState<{ type: string; title: string } | null>(null);

  const ctaClick = () => {
    if (matrix.plan === "free" || matrix.plan === "rookie") {
      location.assign(appPath("/register"));
      return;
    }
    if (matrix.plan === "developer" || matrix.plan === "business") {
      const interval = matrix.annual ? "year" : "month";
      location.assign(
        appPath(
          `/checkout?tier=${matrix.plan}&seats=${matrix.licenses}&interval=${interval}&selfHosted=${matrix.selfHosted ? "1" : "0"}`,
        ),
      );
      return;
    }
    const data = PLANS[matrix.plan];
    matrix.setOpen(false);
    setContact({ type: data.ctaType, title: t(`pricing.contact_title_${data.ctaType}`) });
  };

  if (settings.data && settings.data.billing_enabled === false) return <Navigate to="/" replace />;

  return (
    <>
      <Seo
        title={t("seo.pricing.title")}
        description={t("seo.pricing.description")}
        path="/pricing/"
        localizedPath="/pricing/"
      />

      <PublicShell>
        <PublicHeader variant="pr" path="/pricing/" />

        <main className="pr-main">
          <div className="pr-hero">
            <Reveal className="pr-hero-copy">
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
            </Reveal>
            <Reveal className="pr-choice-guide" delay={0.1} offset={16}>
              <span className="pr-choice-eyebrow">{t("pricing.guide.eyebrow")}</span>
              <h2>{t("pricing.guide.title")}</h2>
              <p>{t("pricing.guide.body")}</p>
              <div className="pr-choice-list">
                {["selfhosted", "managed", "byok"].map((item, index) => (
                  <div className="pr-choice-item" key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{t(`pricing.guide.${item}_title`)}</strong>
                      <p>{t(`pricing.guide.${item}_body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href="#plans">{t("pricing.guide.action")} ↓</a>
            </Reveal>
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

          <div className="pr-grid" id="plans">
            {CARDS.map((card) => (
              <div className={`pr-card${card.featured ? " pr-card--featured" : ""}`} key={card.id}>
                {card.featured && <span className="pr-card-badge">{t("pricing.recommended")}</span>}

                <div className="pr-plan-name">{t(`pricing.${card.nameKey}`)}</div>

                <div className="pr-plan-target">{t(`pricing.${card.targetKey}`)}</div>

                <div className="pr-price-cell">
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

                </div>

                {/* Siempre presente aunque el plan no tenga licencias: si la
                  fila desaparece en unas tarjetas y en otras no, la rejilla
                  deja de cuadrar en horizontal. */}
                <div className="pr-seats">{card.seatsKey ? t(`pricing.${card.seatsKey}`) : ""}</div>

                <p className="pr-service-desc">{t(`pricing.${card.descKey}`)}</p>

                <div className="pr-service">
                  <div className="pr-service-label">{t("pricing.service_label")}</div>

                  <ul className="pr-service-list">
                    {card.features.map((featureKey) => (
                      <li
                        className={
                          featureKey.startsWith("svc_prev_") ? "pr-service-prev" : undefined
                        }
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
                    <span
                      className={`pr-support-tag${card.supportHi ? " pr-support-tag--hi" : ""}`}
                    >
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
                  <rect
                    x="1"
                    y="3"
                    width="16"
                    height="4"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <rect
                    x="1"
                    y="10"
                    width="16"
                    height="4"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
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
            <button
              type="button"
              className="pr-btn pr-open-plan-btn"
              onClick={() => matrix.setOpen(true)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 2v12M2 8h12"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
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

        {matrix.open && <PriceMatrixModal matrix={matrix} onCta={ctaClick} />}

        {contact && (
          <PricingContactModal
            type={contact.type}
            title={contact.title}
            onClose={() => setContact(null)}
          />
        )}

        <PublicFooter path="/pricing/" />
      </PublicShell>
    </>
  );
}
