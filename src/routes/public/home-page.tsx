import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { platformQuery } from "@/api/public-queries";
import { Seo } from "@/components/seo";
import { PublicIcon } from "@/components/public-icons";
import { AgentNetwork } from "@/components/agent-network";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PublicCodeBlock } from "@/components/public-code-block";
import { PublicShell, Reveal, Stagger } from "@/components/public-motion";
import { usePublicNavigation } from "@/i18n/public-paths";
import { useCountUp, useRotatingIndex } from "./use-hero-motion";
import "@/styles/routes/landing.css";

export const INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/iagentshub/iAgents/main/install.sh | bash";
export const WINDOWS_INSTALL_COMMAND =
  "irm https://raw.githubusercontent.com/iagentshub/iAgents/main/install.ps1 | iex";
const homeFeatures = [
  "groups",
  "multi_agent",
  "providers",
  "knowledge",
  "selfhosted",
  "export",
] as const;
const GROUP_RESOURCES = ["agents", "knowledge", "connections", "workflows"] as const;
/** Nombres de marca: no se traducen, igual que "iAgentsHub". */
const PROVIDERS = ["Claude", "OpenAI", "Gemini", "Grok", "Ollama"] as const;
const HOW_STEPS = ["install", "connect", "build"] as const;

export function HomePage() {
  const { t, i18n } = useTranslation();
  const platform = useQuery(platformQuery);
  const { publicLink } = usePublicNavigation(i18n, "/");
  const providerIndex = useRotatingIndex(PROVIDERS.length, 2200);
  const providersCount = useCountUp(6, 900);
  const privacyCount = useCountUp(100, 900);

  if (platform.isPending) return null;
  if (!platform.data?.landing_enabled || platform.isError) {
    location.replace(appPath("/login"));
    return null;
  }

  return (
    <>
      <Seo
        title={t("seo.home.title")}
        description={t("seo.home.description")}
        path="/"
        localizedPath="/"
      />

      <PublicShell className="landing-page">
        <PublicHeader variant="landing" path="/" billingEnabled={platform.data?.billing_enabled} />

        <section className="landing-hero">
          <div className="landing-hero-copy">
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
              <PublicCodeBlock
                variant="compact"
                label={t("landing.hero.install_label")}
                command={INSTALL_COMMAND}
                copyLabel={t("landing.install.copy")}
                copiedLabel={t("landing.install.copied")}
                copyFailedLabel={t("common.status.copy_failed")}
              />
            </div>

            <div className="landing-hero-stats">
              <div className="landing-hero-stat">
                <span className="landing-hero-stat-num">
                  {/* La cifra va en su propio nodo: el contador le escribe el
                    textContent y no debe llevarse por delante el signo. */}
                  <span ref={providersCount}>6</span>
                  <span className="landing-hero-stat-accent">+</span>
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
                  <span ref={privacyCount}>100</span>
                  <span className="landing-hero-stat-accent">%</span>
                </span>
                <span className="landing-hero-stat-label">{t("landing.stats.private")}</span>
              </div>
            </div>
          </div>

          <Reveal className="landing-hero-network" delay={0.12} offset={16}>
            <AgentNetwork />
          </Reveal>
        </section>

        <div className="landing-hero-providers">
          <span className="landing-hero-providers-label">{t("landing.hero.providers_label")}</span>
          <span className="sr-only">{PROVIDERS.join(", ")}</span>
          <span className="landing-hero-provider" aria-hidden="true">
            {PROVIDERS.map((provider, index) => (
              <span key={provider} className={index === providerIndex ? "is-active" : undefined}>
                {provider}
              </span>
            ))}
          </span>
        </div>

        <section className="landing-groups" aria-labelledby="landing-groups-title">
          <Reveal className="landing-groups-copy">
            <span className="landing-section-eyebrow">{t("landing.groups.eyebrow")}</span>
            <h2 id="landing-groups-title">{t("landing.groups.title")}</h2>
            <p>{t("landing.groups.body")}</p>
            <ul className="landing-groups-benefits">
              {["ownership", "cascade", "credentials"].map((benefit) => (
                <li key={benefit}>{t(`landing.groups.${benefit}`)}</li>
              ))}
            </ul>
            <Link className="btn btn-primary" to={`${publicLink("/docs")}#teams`}>
              {t("landing.groups.cta")}
            </Link>
          </Reveal>

          <Reveal className="landing-groups-map" delay={0.1} offset={16}>
            <div className="landing-group-core">
              <PublicIcon name="groups" />
              <strong>{t("landing.groups.node")}</strong>
              <span>{t("landing.groups.members")}</span>
            </div>
            <Stagger className="landing-group-resources" step={0.06}>
              {GROUP_RESOURCES.map((resource) => (
                <div className="landing-group-resource" key={resource}>
                  <span aria-hidden="true" />
                  <strong>{t(`landing.groups.resources.${resource}`)}</strong>
                </div>
              ))}
            </Stagger>
          </Reveal>
        </section>

        <section className="landing-section" aria-labelledby="landing-capabilities-title">
          <Reveal className="landing-section-intro">
            <span className="landing-section-eyebrow">{t("landing.overview.eyebrow")}</span>
            <h2 id="landing-capabilities-title">{t("landing.overview.title")}</h2>
            <p>{t("landing.overview.body")}</p>
          </Reveal>

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

        <section className="landing-how-shell" aria-labelledby="landing-how-title">
          <div className="landing-how-content">
            <Reveal className="landing-section-intro landing-how-intro">
              <span className="landing-section-eyebrow">{t("landing.how.eyebrow")}</span>
              <h2 id="landing-how-title">{t("landing.how.title")}</h2>
            </Reveal>

            <ol className="landing-steps">
              {HOW_STEPS.map((step, index) => (
                <li className="landing-step" key={step}>
                  <span className="landing-step-num">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{t(`landing.how.${step}_title`)}</h3>
                  <p>{t(`landing.how.${step}_body`)}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="landing-band">
            <div className="landing-install">
              <div className="landing-install-title">{t("landing.install.title")}</div>
              <p className="landing-install-hint">{t("landing.install.hint")}</p>

              <div className="landing-install-commands">
                <div>
                  <PublicCodeBlock
                    label={t("landing.install.unix_label")}
                    command={INSTALL_COMMAND}
                    copyLabel={t("landing.install.copy")}
                    copiedLabel={t("landing.install.copied")}
                    copyFailedLabel={t("common.status.copy_failed")}
                  />
                </div>
                <div>
                  <PublicCodeBlock
                    label={t("landing.install.windows_label")}
                    command={WINDOWS_INSTALL_COMMAND}
                    copyLabel={t("landing.install.copy")}
                    copiedLabel={t("landing.install.copied")}
                    copyFailedLabel={t("common.status.copy_failed")}
                  />
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
          </div>
        </section>

        <PublicFooter path="/" billingEnabled={platform.data?.billing_enabled} />
      </PublicShell>
    </>
  );
}
