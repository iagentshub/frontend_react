import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { platformQuery } from "@/api/public-queries";
import { Seo } from "@/components/seo";
import { PublicIcon } from "@/components/public-icons";
import { usePublicNavigation } from "@/i18n/public-paths";
import "@/styles/routes/landing.css";

export const INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/iagentshub/iAgents/main/install.sh | bash";
export const WINDOWS_INSTALL_COMMAND =
  "irm https://raw.githubusercontent.com/iagentshub/iAgents/main/install.ps1 | iex";
const homeFeatures = [
  "multi_agent",
  "providers",
  "selfhosted",
  "knowledge",
  "groups",
  "export",
] as const;
/** Nombres de marca: no se traducen, igual que "iAgentsHub". */
const PROVIDERS = ["Claude", "OpenAI", "Gemini", "Grok", "Ollama"] as const;
const HOW_STEPS = ["install", "connect", "build"] as const;

export function HomePage() {
  const { t, i18n } = useTranslation();
  const platform = useQuery(platformQuery);
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, "/");
  const [copied, setCopied] = useState(false);
  const [copiedWindows, setCopiedWindows] = useState(false);

  if (platform.isPending) return null;
  if (!platform.data?.landing_enabled || platform.isError) {
    location.replace(appPath("/login"));
    return null;
  }

  const copyCommand = async () => {
    await navigator.clipboard.writeText(INSTALL_COMMAND);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  const copyWindowsCommand = async () => {
    await navigator.clipboard.writeText(WINDOWS_INSTALL_COMMAND);
    setCopiedWindows(true);
    window.setTimeout(() => setCopiedWindows(false), 1500);
  };

  return (
    <>
      <Seo
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        path="/"
        localizedPath="/"
      />

      <div className="landing-page" style={{ display: "block" }}>
        <header className="landing-header">
          <Link className="landing-logo" to={publicLink("/")}>
            {t("common.brand.prefix")}
            <span>{t("common.brand.suffix")}</span>
          </Link>

          <nav className="landing-nav" aria-label={t("common.footer.product")}>
            <Link to={publicLink("/docs")}>{t("common.navigation.docs")}</Link>
            {platform.data?.billing_enabled && (
              <Link to={publicLink("/pricing/")}>{t("common.navigation.pricing")}</Link>
            )}
            <Link to={publicLink("/support")}>{t("common.navigation.support")}</Link>
            <a
              href="https://github.com/iagentshub/iAgents"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("common.github")}
            </a>
          </nav>

          <div className="landing-header-spacer" />

          <a className="btn btn-ghost btn-sm" href={appPath("/login")}>
            {t("about.header.login")}
          </a>

          <a className="btn btn-primary btn-sm" href={appPath("/register")}>
            {t("landing.header.cta_register")}
          </a>
        </header>

        <section className="landing-hero">
          <span className="landing-hero-badge">{t("landing.hero.badge")}</span>

          <h1 className="landing-hero-title">{t("landing.hero.headline")}</h1>

          <p className="landing-hero-body">{t("landing.hero.sub")}</p>

          <div className="landing-hero-actions">
            <a className="btn btn-primary" href={appPath("/register")}>
              {t("landing.header.cta_register")}
            </a>
            <Link className="btn btn-ghost" to={publicLink("/docs")}>
              {t("landing.overview.docs_cta")}
            </Link>
          </div>

          {/* El comando es el activo más concreto del producto: se enseña
              arriba, no enterrado al final de la página. */}
          <div className="landing-hero-install">
            <span className="landing-install-os">{t("landing.hero.install_label")}</span>
            <div className="landing-install-cmd">
              <code className="landing-install-code" tabIndex={0}>
                {INSTALL_COMMAND}
              </code>
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => void copyCommand()}
              >
                {copied ? t("landing.install.copied") : t("landing.install.copy")}
              </button>
            </div>
          </div>

          {/* Los proveedores estaban en la cuarta línea de un párrafo. Aquí
              dicen de qué va el producto sin necesidad de leer. */}
          <div className="landing-hero-providers">
            <span className="landing-hero-providers-label">
              {t("landing.hero.providers_label")}
            </span>
            <ul>
              {PROVIDERS.map((provider) => (
                <li key={provider}>{provider}</li>
              ))}
            </ul>
          </div>

          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                6<span className="landing-hero-stat-accent">+</span>
              </span>
              <span className="landing-hero-stat-label">{t("landing.stats.providers")}</span>
            </div>

            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                <span className="landing-hero-stat-accent">∞</span>
              </span>
              <span className="landing-hero-stat-label">{t("landing.stats.agents")}</span>
            </div>

            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                100<span className="landing-hero-stat-accent">%</span>
              </span>
              <span className="landing-hero-stat-label">{t("landing.stats.private")}</span>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="landing-capabilities-title">
          <div className="landing-section-intro">
            <span className="landing-section-eyebrow">{t("landing.overview.eyebrow")}</span>
            <h2 id="landing-capabilities-title">{t("landing.overview.title")}</h2>
            <p>{t("landing.overview.body")}</p>
          </div>

          <div className="landing-feature-grid">
            {homeFeatures.map((feature) => (
              <article className="landing-feature-card" key={feature} data-feature={feature}>
                <span className="landing-feature-icon">
                  <PublicIcon name={feature} />
                </span>
                <h3>{t(`landing.features.${feature}_title`)}</h3>
                <p>{t(`landing.features.${feature}_body`)}</p>
              </article>
            ))}
          </div>

          <div className="landing-section-actions">
            <Link className="btn btn-primary" to={publicLink("/docs")}>
              {t("landing.overview.docs_cta")}
            </Link>
            {platform.data?.billing_enabled && (
              <Link className="btn btn-ghost" to={publicLink("/pricing/")}>
                {t("landing.overview.pricing_cta")}
              </Link>
            )}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="landing-how-title">
          <div className="landing-section-intro">
            <span className="landing-section-eyebrow">{t("landing.how.eyebrow")}</span>
            <h2 id="landing-how-title">{t("landing.how.title")}</h2>
          </div>

          <ol className="landing-steps">
            {HOW_STEPS.map((step, index) => (
              <li className="landing-step" key={step}>
                <span className="landing-step-num">{index + 1}</span>
                <h3>{t(`landing.how.${step}_title`)}</h3>
                <p>{t(`landing.how.${step}_body`)}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Banda a sangre completa: un solo cambio de fondo en toda la página
            rompe tres pantallas del mismo gris. Dentro se redefinen los tokens
            del tema, así que la tarjeta y los botones se adaptan solos. */}
        <section className="landing-band">
          <div className="landing-install">
            <div className="landing-install-title">{t("landing.install.title")}</div>
            <p className="landing-install-hint">{t("landing.install.hint")}</p>

            <div className="landing-install-commands">
              <div>
                <span className="landing-install-os">{t("landing.install.unix_label")}</span>
                <div className="landing-install-cmd">
                  {/* El comando desborda en pantallas estrechas y se
                      desplaza en horizontal: WCAG exige que esa región se
                      pueda alcanzar con el teclado. */}
                  <code className="landing-install-code" tabIndex={0}>
                    {INSTALL_COMMAND}
                  </code>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => void copyCommand()}
                  >
                    {copied ? t("landing.install.copied") : t("landing.install.copy")}
                  </button>
                </div>
              </div>
              <div>
                <span className="landing-install-os">{t("landing.install.windows_label")}</span>
                <div className="landing-install-cmd">
                  <code className="landing-install-code" tabIndex={0}>
                    {WINDOWS_INSTALL_COMMAND}
                  </code>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => void copyWindowsCommand()}
                  >
                    {copiedWindows ? t("landing.install.copied") : t("landing.install.copy")}
                  </button>
                </div>
              </div>
            </div>

            <div className="landing-install-modes">
              <p>
                <strong>{t("landing.install.docker_label")}</strong>{" "}
                {t("landing.install.docker_body")}
              </p>
              <p>
                <strong>{t("landing.install.local_label")}</strong>{" "}
                {t("landing.install.local_body")}
              </p>
            </div>
            <p className="landing-install-components">{t("landing.install.components")}</p>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-footer-brand">
              <Link className="landing-logo" to={publicLink("/")}>
                {t("common.brand.prefix")}
                <span>{t("common.brand.suffix")}</span>
              </Link>
              <p className="landing-footer-tagline">{t("landing.hero.badge")}</p>
            </div>

            <nav className="landing-footer-col" aria-label={t("common.footer.product")}>
              <span className="landing-footer-heading">{t("common.footer.product")}</span>
              <Link to={publicLink("/about")}>{t("common.navigation.about")}</Link>
              <Link to={publicLink("/docs")}>{t("common.navigation.docs")}</Link>
              {platform.data?.billing_enabled && (
                <Link to={publicLink("/pricing/")}>{t("common.navigation.pricing")}</Link>
              )}
            </nav>

            <nav className="landing-footer-col" aria-label={t("common.footer.resources")}>
              <span className="landing-footer-heading">{t("common.footer.resources")}</span>
              <Link to={publicLink("/support")}>{t("common.navigation.support")}</Link>
              <a
                href="https://github.com/iagentshub/iAgents"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("common.github")}
              </a>
            </nav>

            <nav className="landing-footer-col" aria-label={t("common.footer.legal")}>
              <span className="landing-footer-heading">{t("common.footer.legal")}</span>
              <Link to={publicLink("/privacy")}>{t("common.navigation.privacy")}</Link>
              <Link to={publicLink("/terms")}>{t("common.navigation.terms")}</Link>
            </nav>
          </div>

          <div className="landing-footer-bottom">
            <span>{t("common.footer.rights")}</span>
            <button
              className="landing-lang-btn"
              type="button"
              onClick={() => void switchLanguage()}
            >
              {language.toUpperCase()}
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}
