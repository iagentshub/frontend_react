import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { platformQuery } from "@/auth/queries";
import { Seo } from "@/components/seo";
import { usePublicNavigation } from "@/i18n/public-paths";
import "@/styles/routes/landing.css";
type InstallMode = "docker" | "nodocker";
type InstallOs = "linux" | "mac" | "windows";
type InstallFrontend = "vanilla" | "react";

const frontends: InstallFrontend[] = ["vanilla", "react"];
const modes: InstallMode[] = ["docker", "nodocker"];
const operatingSystems: InstallOs[] = ["linux", "mac", "windows"];
const homeFeatures = [
  "multi_agent",
  "providers",
  "selfhosted",
  "knowledge",
  "groups",
  "export",
] as const;
const modeToFlag: Record<InstallMode, string> = { docker: "docker", nodocker: "local" };

function buildInstallCommand(frontend: InstallFrontend, mode: InstallMode, os: InstallOs): string {
  const modeFlag = modeToFlag[mode];
  if (os === "windows") {
    return `$env:IAGENTSHUB_FRONTEND = "${frontend}"; $env:IAGENTSHUB_MODE = "${modeFlag}"; irm https://raw.githubusercontent.com/iagentshub/iAgents/main/install.ps1 | iex`;
  }
  return `curl -fsSL https://raw.githubusercontent.com/iagentshub/iAgents/main/install.sh | IAGENTSHUB_FRONTEND=${frontend} IAGENTSHUB_MODE=${modeFlag} bash`;
}

function nextValue<T>(values: T[], current: T): T {
  const index = values.indexOf(current);
  return values[(index + 1) % values.length] ?? values[0]!;
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const platform = useQuery(platformQuery);
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, "/");
  const [frontend, setFrontend] = useState<InstallFrontend>("react");
  const [mode, setMode] = useState<InstallMode>("docker");
  const [os, setOs] = useState<InstallOs>("linux");
  const [copied, setCopied] = useState(false);

  if (platform.isPending) return null;
  if (!platform.data?.landing_enabled || platform.isError) {
    location.replace(appPath("/login"));
    return null;
  }

  const command = buildInstallCommand(frontend, mode, os);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
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
            {t("legacy.text_1fda9fc57a04")}
            <span>{t("legacy.text_a38df5fc50fb")}</span>
          </Link>

          <div className="landing-header-spacer" />

          <a className="btn btn-ghost btn-sm" href={appPath("/login")}>
            {t("about.header.login")}
          </a>
        </header>

        <section className="landing-hero">
          <span className="landing-hero-badge">{t("landing.hero.badge")}</span>

          <h1 className="landing-hero-title">{t("landing.hero.headline")}</h1>

          <p className="landing-hero-body">{t("landing.hero.sub")}</p>

          <div className="landing-hero-stats">
            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                6<span className="landing-hero-stat-accent">+</span>
              </span>
              <span className="landing-hero-stat-label">{t("auth.stat_providers")}</span>
            </div>

            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                <span className="landing-hero-stat-accent">∞</span>
              </span>
              <span className="landing-hero-stat-label">{t("auth.stat_agents")}</span>
            </div>

            <div className="landing-hero-stat">
              <span className="landing-hero-stat-num">
                100<span className="landing-hero-stat-accent">%</span>
              </span>
              <span className="landing-hero-stat-label">{t("auth.stat_private")}</span>
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
              <article className="landing-feature-card" key={feature}>
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

        <section className="landing-section">
          <div className="landing-install">
            <div className="landing-install-title">{t("landing.install.title")}</div>

            <div className="landing-install-toggles">
              <button
                className="landing-toggle"
                type="button"
                onClick={() => setFrontend(nextValue(frontends, frontend))}
              >
                {t(`landing.install.frontend_${frontend}`)}
              </button>

              <button
                className="landing-toggle"
                type="button"
                onClick={() => setMode(nextValue(modes, mode))}
              >
                {t(`landing.install.mode_${mode}`)}
              </button>

              <button
                className="landing-toggle"
                type="button"
                onClick={() => setOs(nextValue(operatingSystems, os))}
              >
                {t(`landing.install.os_${os}`)}
              </button>
            </div>

            <div className="landing-install-cmd">
              <code className="landing-install-code">{command}</code>

              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => void copyCommand()}
              >
                {copied ? t("landing.install.copied") : t("landing.install.copy")}
              </button>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <Link to={publicLink("/about")}>{t("auth.about_link")}</Link>

          <Link to={publicLink("/docs")}>{t("auth.docs_link")}</Link>

          {platform.data?.billing_enabled && (
            <Link to={publicLink("/pricing/")}>{t("auth.pricing_link")}</Link>
          )}

          <Link to={publicLink("/support")}>{t("nav.support")}</Link>

          <a href="https://github.com/iagentshub/iAgents" target="_blank" rel="noopener noreferrer">
            {t("errors.fields.github")}
          </a>

          <button className="landing-lang-btn" type="button" onClick={() => void switchLanguage()}>
            {language.toUpperCase()}
          </button>
        </footer>
      </div>
    </>
  );
}
