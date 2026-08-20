import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { usePublicNavigation, type PublicBasePath } from "@/i18n/public-paths";

export function PublicFooter({
  path,
  billingEnabled = true,
}: {
  path: PublicBasePath;
  billingEnabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, path);

  return (
    <footer className="public-footer">
      <div className="public-footer-inner">
        <div className="public-footer-brand">
          <Link className="public-footer-logo" to={publicLink("/")}>
            {t("common.brand.prefix")}
            <span>{t("common.brand.suffix")}</span>
          </Link>
          <p className="public-footer-tagline">{t("landing.hero.badge")}</p>
        </div>

        <nav className="public-footer-column" aria-label={t("common.footer.product")}>
          <span className="public-footer-heading">{t("common.footer.product")}</span>
          <Link to={publicLink("/about")}>{t("common.navigation.about")}</Link>
          <Link to={publicLink("/docs")}>{t("common.navigation.docs")}</Link>
          {billingEnabled && (
            <Link to={publicLink("/pricing/")}>{t("common.navigation.pricing")}</Link>
          )}
        </nav>

        <nav className="public-footer-column" aria-label={t("common.footer.resources")}>
          <span className="public-footer-heading">{t("common.footer.resources")}</span>
          <Link to={publicLink("/support")}>{t("common.navigation.support")}</Link>
          <a href="https://github.com/iagentshub/iAgents" target="_blank" rel="noopener noreferrer">
            {t("common.github")}
          </a>
        </nav>

        <nav className="public-footer-column" aria-label={t("common.footer.legal")}>
          <span className="public-footer-heading">{t("common.footer.legal")}</span>
          <Link to={publicLink("/privacy")}>{t("common.navigation.privacy")}</Link>
          <Link to={publicLink("/terms")}>{t("common.navigation.terms")}</Link>
        </nav>
      </div>

      <div className="public-footer-bottom">
        {/* Afirmar la licencia sin enlazarla obliga a fiarse: el enlace lleva
          al LICENSE del repositorio. */}
        <span>
          {t("common.footer.rights")} ·{" "}
          <a
            href="https://github.com/iagentshub/iAgents/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("common.footer.license")}
          </a>
        </span>
        {/* Un «ES» suelto se lee como etiqueta, no como control. Con las dos
          opciones a la vista se ve que se puede pulsar. */}
        <button
          className="public-footer-language"
          type="button"
          onClick={() => void switchLanguage()}
          aria-label={t("common.footer.change_language")}
        >
          <span className={language === "es" ? "is-active" : undefined}>ES</span>
          <span className={language === "en" ? "is-active" : undefined}>EN</span>
        </button>
      </div>
    </footer>
  );
}
