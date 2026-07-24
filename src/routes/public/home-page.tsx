import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import { platformQuery } from "@/auth/queries";
import "@/styles/routes/landing.css";
type InstallFrontend = "vanilla" | "react";
type InstallMode = "docker" | "nodocker";
type InstallOs = "linux" | "mac" | "windows";

const frontends: InstallFrontend[] = ["vanilla", "react"];
const modes: InstallMode[] = ["docker", "nodocker"];
const operatingSystems: InstallOs[] = ["linux", "mac", "windows"];
// install.sh/install.ps1 preguntan frontend y modo de forma interactiva, pero
// ese prompt depende de una TTY real (`[ -t 0 ]`) que NO existe en
// "curl ... | bash" (stdin es el pipe) — sin esto, el script cae siempre al
// valor por defecto (docker) sin importar qué mostrara el toggle. Por eso
// frontend y modo se fijan siempre explícitos vía variables de entorno
// (bash: tras el pipe, antes de "bash", ya que "VAR=x curl ... | bash" solo
// afecta a curl, no al bash del pipe; PowerShell: $env: antes de invocar irm).
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
  const [frontend, setFrontend] = useState<InstallFrontend>("vanilla");
  const [mode, setMode] = useState<InstallMode>("docker");
  const [os, setOs] = useState<InstallOs>("linux");
  const [copied, setCopied] = useState(false);

  if (platform.isPending) return null;
  if (!platform.data?.landing_enabled || platform.isError) return <Navigate to="/login/" replace />;

  const command = buildInstallCommand(frontend, mode, os);
  const copyCommand = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <title>iAgents Hub</title>
      <div className="landing-page" style={{ display: "block" }}>
        <header className="landing-header">
          <Link className="landing-logo" to="/">iAgents<span>Hub</span></Link>
          <div className="landing-header-spacer" />
          <Link className="btn btn-ghost btn-sm" to="/login/">{t("about.header.login")}</Link>
        </header>

        <section className="landing-hero">
          <span className="landing-hero-badge">{t("landing.hero.badge")}</span>
          <h1 className="landing-hero-title">{t("landing.hero.headline")}</h1>
          <p className="landing-hero-body">{t("landing.hero.sub")}</p>
          <div className="landing-hero-stats">
            <div className="landing-hero-stat"><span className="landing-hero-stat-num">6<span className="landing-hero-stat-accent">+</span></span><span className="landing-hero-stat-label">{t("auth.stat_providers")}</span></div>
            <div className="landing-hero-stat"><span className="landing-hero-stat-num"><span className="landing-hero-stat-accent">∞</span></span><span className="landing-hero-stat-label">{t("auth.stat_agents")}</span></div>
            <div className="landing-hero-stat"><span className="landing-hero-stat-num">100<span className="landing-hero-stat-accent">%</span></span><span className="landing-hero-stat-label">{t("auth.stat_private")}</span></div>
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-install">
            <div className="landing-install-title">{t("landing.install.title")}</div>
            <div className="landing-install-toggles">
              <button className="landing-toggle" type="button" onClick={() => setFrontend(nextValue(frontends, frontend))}>{t(`landing.install.frontend_${frontend}`)}</button>
              <button className="landing-toggle" type="button" onClick={() => setMode(nextValue(modes, mode))}>{t(`landing.install.mode_${mode}`)}</button>
              <button className="landing-toggle" type="button" onClick={() => setOs(nextValue(operatingSystems, os))}>{t(`landing.install.os_${os}`)}</button>
            </div>
            <div className="landing-install-cmd">
              <code className="landing-install-code">{command}</code>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => void copyCommand()}>{copied ? t("landing.install.copied") : t("landing.install.copy")}</button>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <Link to="/about">{t("auth.about_link")}</Link>
          <Link to="/docs">{t("auth.docs_link")}</Link>
          <Link to="/support">{t("nav.support")}</Link>
          <a href="https://github.com/iagentshub/iAgents" target="_blank" rel="noopener noreferrer">GitHub</a>
          <button className="landing-lang-btn" type="button" onClick={() => void i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}>{i18n.language.toUpperCase()}</button>
        </footer>
      </div>
    </>
  );
}

