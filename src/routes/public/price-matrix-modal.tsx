import { useTranslation } from "react-i18next";
import { fmt, fmtInt, PLANS, type Tier1 } from "./pricing-model";
import type { PriceMatrix } from "./use-price-matrix";

/**
 * Modal "calcula tu mejor plan y presupuesto" de pricing.
 *
 * Era ~200 líneas de JSX inline dentro de PricingPage, mezcladas con el resto
 * de la página. El estado y la aritmética viven en usePriceMatrix; aquí solo
 * queda la presentación.
 */
export function PriceMatrixModal({ matrix, onCta }: { matrix: PriceMatrix; onCta: () => void }) {
  const { t } = useTranslation();

  return (
    <div
      className="pm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) matrix.setOpen(false);
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

          <button
            className="pm-close"
            aria-label={t("pricing.close")}
            onClick={() => matrix.setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M3 3l10 10M13 3L3 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
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
              value={matrix.licenses}
              onChange={(event) => matrix.onSliderChange(parseInt(event.target.value, 10))}
            />

            <div className="pm-count-wrap">
              <span className="pm-count-num">
                {matrix.licenses >= 500 ? "500+" : matrix.licenses}
              </span>
              <span className="pm-count-label">{t("pricing.calc_licenses")}</span>
            </div>
          </div>

          <div className="pm-zones">
            <button
              className={`pm-zone${matrix.zoneKey === "developer" ? " active" : ""}`}
              onClick={() => matrix.onZoneClick(1)}
            >
              {t("pricing.plan_dev")}
            </button>

            <button
              className={`pm-zone${matrix.zoneKey === "business" ? " active" : ""}`}
              onClick={() => matrix.onZoneClick(25)}
            >
              {t("pricing.plan_biz")}
            </button>

            <button
              className={`pm-zone${matrix.zoneKey === "enterprise" ? " active" : ""}`}
              onClick={() => matrix.onZoneClick(150)}
            >
              {t("pricing.plan_ent")}
            </button>
          </div>

          {matrix.licenses === 1 && (
            <div className="pm-tier-toggle">
              <button
                type="button"
                className={`pm-tier-btn${matrix.tierAt1 === "rookie" ? " pm-tier-btn--active" : ""}`}
                onClick={() => matrix.onTierAt1Change("rookie" satisfies Tier1)}
              >
                <span>{t("pricing.plan_starter")}</span>
                <span className="pm-tier-price">{t("pricing.price_free")}</span>
              </button>

              <button
                type="button"
                className={`pm-tier-btn${matrix.tierAt1 === "developer" ? " pm-tier-btn--active" : ""}`}
                onClick={() => matrix.onTierAt1Change("developer" satisfies Tier1)}
              >
                <span>{t("pricing.plan_dev")}</span>
                <span className="pm-tier-price">€9/mes</span>
              </button>
            </div>
          )}
        </div>

        <div className="pm-body">
          <div className="pm-left">
            <div className={`pm-card ${matrix.animClass}`}>
              <div className="pm-badge">{t("pricing.pm_recommended")}</div>
              <div className="pm-plan-name">{t(`pricing.${PLANS[matrix.plan].nameKey}`)}</div>

              <ul className="pm-benefits">
                {PLANS[matrix.plan].benefits.map((benefitKey) => (
                  <li key={benefitKey}>{t(`pricing.${benefitKey}`)}</li>
                ))}
                <li className="pm-benefit-support">
                  {t(`pricing.${PLANS[matrix.plan].supportKey}`)}
                </li>
              </ul>
            </div>
          </div>

          <div className="pm-right">
            <div className="pm-billing-wrap">
              <span className="pm-billing-label">{t("pricing.calc_billing")}</span>

              <div className="pm-billing-toggle">
                <button
                  className={`pm-tbtn${!matrix.annual ? " active" : ""}`}
                  onClick={() => matrix.setAnnual(false)}
                >
                  {t("pricing.toggle_monthly")}
                </button>

                <button
                  className={`pm-tbtn${matrix.annual ? " active" : ""}`}
                  onClick={() => matrix.setAnnual(true)}
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
                  checked={!matrix.isFreeState && matrix.selfHosted}
                  disabled={matrix.isFreeState}
                  onChange={(event) => matrix.setSelfHosted(event.target.checked)}
                />
                <span className="pr-calc-check-box" />
                <span className="pm-sh-text">
                  <span>{t("pricing.calc_sh_label")}</span>
                  <span className="pr-calc-sh-note">
                    {!matrix.isFreeState &&
                      t(matrix.annual ? "pricing.calc_sh_annual" : "pricing.calc_sh_monthly")}
                  </span>
                </span>
              </label>

              <button
                type="button"
                className={`pm-info-btn${matrix.infoOpen ? " open" : ""}`}
                aria-label={t("pricing.calc_sh_info")}
                onClick={(event) => {
                  event.stopPropagation();
                  matrix.setInfoOpen((value) => !value);
                }}
              >
                i<div className="pm-info-tooltip">{t("pricing.calc_sh_info")}</div>
              </button>
            </div>

            <div className="pm-divider" />

            <div className="pm-price-block">
              <div className="pm-ppl">
                {!matrix.isFreeState && `${fmt(matrix.pricePerLic)} / ${t("pricing.calc_per_lic")}`}
              </div>

              <div className="pm-total-monthly">
                <span className="pm-total-num">
                  {matrix.isFreeState ? t("pricing.price_free") : fmtInt(matrix.monthlyTotal)}
                </span>
                {!matrix.isFreeState && (
                  <span className="pm-total-period">{t("pricing.calc_month")}</span>
                )}
              </div>

              {!matrix.isFreeState && matrix.annual && (
                <div className="pm-total-annual">
                  <span className="pm-total-annual-num">{fmtInt(matrix.annualTotal)}</span>
                  <span className="pm-total-period">{t("pricing.calc_year")}</span>
                </div>
              )}

              <div className="pm-savings">
                {!matrix.isFreeState &&
                  matrix.annual &&
                  t("pricing.calc_free_months") +
                    (matrix.saving > 0
                      ? ` (${t("pricing.calc_saving_of")} ${fmtInt(matrix.saving)})`
                      : "")}
              </div>

              {!matrix.isFreeState && <div className="pm-vat-note">{t("pricing.vat_note")}</div>}
            </div>

            <button type="button" className="pr-btn pm-cta" onClick={onCta}>
              {matrix.isFreeState
                ? t("pricing.pm_cta_free")
                : `${t("pricing.pm_cta")} ${t(`pricing.${PLANS[matrix.plan].nameKey}`)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
