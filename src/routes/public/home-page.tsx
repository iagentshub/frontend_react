import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { platformQuery } from "@/api/public-queries";
import { Seo } from "@/components/seo";
import { PublicIcon } from "@/components/public-icons";
import { PublicHeader } from "@/components/public-header";
import { PublicFooter } from "@/components/public-footer";
import { PublicCodeBlock } from "@/components/public-code-block";
import { PublicShell, Reveal } from "@/components/public-motion";
import { usePublicNavigation } from "@/i18n/public-paths";
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
/**
 * Los siete proveedores que soporta el backend, con el host de su API.
 * La fuente es app/config/providers.py más Ollama (app/connections/ollama.py);
 * la tira anunciaba cinco y dejaba fuera Qwen y NVIDIA. Nombres de marca y
 * hosts no se traducen, igual que "iAgents Hub".
 */
const PROVIDERS = [
  ["Claude", "anthropic.com"],
  ["OpenAI", "openai.com"],
  ["Gemini", "googleapis.com"],
  ["Grok", "x.ai"],
  ["Qwen", "aliyuncs.com"],
  ["NVIDIA", "nvidia.com"],
  ["Ollama", "localhost:11434"],
] as const;
/** Muestra del panel del hero. Nombres propios: no se traducen. */
const PANEL_AGENTS = [
  { name: "Atlas", model: "claude-sonnet-4-6", owner: "María", shared: true },
  { name: "Nova", model: "gpt-4o", owner: "Rubén", shared: true },
  { name: "Orión", model: "llama3.1", owner: "María", shared: false },
] as const;
const PANEL_COUNTS = [
  ["agents", 8],
  ["knowledge", 34],
  ["connections", 5],
  ["workflows", 7],
] as const;
const GROUP_MEMBERS = [
  { name: "María", role: "owner" },
  { name: "Rubén", role: "editor" },
  { name: "Ana", role: "viewer" },
] as const;
const GROUP_OWNERSHIP = [
  ["agents", "María"],
  ["knowledge", "Ana"],
  ["connections", "María"],
  ["workflows", "Rubén"],
] as const;
const HOW_STEPS = ["install", "connect", "build"] as const;
const INSTALL_PLATFORMS = ["linux", "macos", "windows"] as const;
type InstallPlatform = (typeof INSTALL_PLATFORMS)[number];

function PlatformIcon({ platform }: { platform: InstallPlatform }) {
  if (platform === "windows") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 5.2 10.5 4v7.2H3V5.2Zm8.6-1.4L21 2.4v8.8h-9.4V3.8ZM3 12.3h7.5v7.3L3 18.5v-6.2Zm8.6 0H21v9.3l-9.4-1.4v-7.9Z" />
      </svg>
    );
  }

  if (platform === "macos") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16.8 12.8c0-2.3 1.9-3.5 2-3.6a4.3 4.3 0 0 0-3.4-1.8c-1.4-.1-2.8.8-3.5.8-.8 0-2-0.8-3.2-.8-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.6 1.3 10.1.9 1.2 1.9 2.6 3.3 2.5 1.3-.1 1.9-.9 3.5-.9 1.7 0 2.1.9 3.5.9 1.5 0 2.4-1.2 3.3-2.5 1-1.4 1.4-2.9 1.4-3-.1 0-4-1.5-4-4.2ZM14.5 5.9c.8-1 1.3-2.4 1.2-3.7-1.2.1-2.6.8-3.5 1.8-.7.8-1.3 2.2-1.1 3.5 1.3.1 2.6-.6 3.4-1.6Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.7c-2.7 0-4.3 2.5-4.3 5.6 0 1.5.3 2.7.9 3.7-1.6 1.5-2.5 3.5-2.5 5.8 0 1.2.3 2.4.8 3.4h10.2c.5-1 .8-2.2.8-3.4 0-2.3-.9-4.3-2.5-5.8.6-1 .9-2.2.9-3.7 0-3.1-1.6-5.6-4.3-5.6Z" />
      <circle cx="10.2" cy="7.8" r=".6" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="7.8" r=".6" fill="currentColor" stroke="none" />
      <path d="m11 9.5 1 .7 1-.7M9 13.2c.8.8 1.8 1.2 3 1.2s2.2-.4 3-1.2M7.4 17.7l-3 1.8M16.6 17.7l3 1.8" />
    </svg>
  );
}

/**
 * El hero enseñaba una red de nodos abstracta que podía ilustrar cualquier
 * producto. Esto es una pantalla del hub: el grupo, sus recursos, sus agentes
 * con propietario y visibilidad, y el consumo. Se entiende sin leer el texto.
 */
function HeroPanel() {
  const { t } = useTranslation();

  return (
    <div className="landing-panel" aria-hidden="true">
      <div className="landing-panel-head">
        <span className="landing-panel-chip">{t("landing.hero.panel.group")}</span>
        <span className="landing-panel-avatars">
          <i>M</i>
          <i>R</i>
          <i>A</i>
          <b>+2</b>
        </span>
      </div>

      <div className="landing-panel-body">
        <ul className="landing-panel-rail">
          {PANEL_COUNTS.map(([resource, count]) => (
            <li key={resource}>
              <span>{t(`landing.groups.resources.${resource}`)}</span>
              <b>{count}</b>
            </li>
          ))}
        </ul>

        <ul className="landing-panel-agents">
          {PANEL_AGENTS.map((agent) => (
            <li key={agent.name}>
              <span className="landing-panel-agent-name">{agent.name}</span>
              <span className="landing-panel-agent-model">{agent.model}</span>
              <span className="landing-panel-agent-owner">{agent.owner}</span>
              <span
                className={`landing-panel-tag${agent.shared ? " is-shared" : ""}`}
                data-shared={agent.shared}
              >
                {t(`landing.hero.panel.${agent.shared ? "shared" : "private"}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="landing-panel-usage">
        <span>{t("landing.hero.panel.tokens")}</span>
        <span className="landing-panel-meter">
          <i style={{ width: "26%" }} />
        </span>
        <b>128k / 500k</b>
      </div>
    </div>
  );
}

/**
 * La tira rotaba un proveedor cada 2,2 s: el 80 % del tiempo escondía lo que
 * ya se puede enseñar. Una cinta continua se mueve igual y acaba enseñándolos
 * todos. El nombre accesible va aparte porque la cinta está duplicada.
 */
function ProvidersMarquee() {
  const { t } = useTranslation();

  return (
    <div className="landing-providers">
      <span className="landing-providers-label">{t("landing.hero.providers_label")}</span>
      <span className="sr-only">{PROVIDERS.map(([name]) => name).join(", ")}</span>
      <div className="landing-providers-viewport">
        <div className="landing-providers-track" aria-hidden="true">
          {[0, 1].map((run) => (
            <span className="landing-providers-run" key={run}>
              {PROVIDERS.map(([name, host]) => (
                <span className="landing-provider" key={name}>
                  <b>{name}</b>
                  <i>{host}</i>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>("linux");
  const platform = useQuery(platformQuery);
  const { publicLink } = usePublicNavigation(i18n, "/");

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
            <span className="landing-hero-kicker">{t("landing.hero.badge")}</span>

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
          </div>

          <Reveal className="landing-hero-panel" delay={0.12} offset={16}>
            <HeroPanel />
          </Reveal>
        </section>

        <ProvidersMarquee />

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

          {/* Las órbitas y las píldoras flotantes no explicaban el permiso, que
            es justo el diferencial. Un cuadro con quién es quién y de quién es
            cada recurso sí lo explica. */}
          <Reveal className="landing-group-board" delay={0.1} offset={16}>
            <div className="landing-board" aria-hidden="true">
              <div className="landing-board-column">
                <span className="landing-board-heading">{t("landing.groups.panel.members")}</span>
                <ul>
                  {GROUP_MEMBERS.map((member) => (
                    <li key={member.name}>
                      <span>{member.name}</span>
                      <em>{t(`landing.groups.panel.${member.role}`)}</em>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="landing-board-column">
                <span className="landing-board-heading">{t("landing.groups.panel.resources")}</span>
                <ul>
                  {GROUP_OWNERSHIP.map(([resource, owner]) => (
                    <li key={resource}>
                      <span>{t(`landing.groups.resources.${resource}`)}</span>
                      <em>{owner}</em>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="landing-board-note">{t("landing.groups.panel.note")}</p>
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
          {/* La banda clara termina donde termina su contenido. Antes se
            estiraba por debajo de la consola y se tapaba con una franja negra
            de 152px pintada con ::after. */}
          <div className="landing-how-band">
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
          </div>

          <div className="landing-band">
            <div className="landing-install">
              <div className="landing-install-header">
                <div>
                  <div className="landing-install-title">{t("landing.install.title")}</div>
                  <p className="landing-install-hint">{t("landing.install.hint")}</p>
                </div>

                <div
                  className="landing-install-platforms"
                  role="group"
                  aria-label={t("landing.install.platform_selector_label")}
                >
                  {INSTALL_PLATFORMS.map((item) => (
                    <button
                      className="landing-install-platform"
                      type="button"
                      aria-pressed={installPlatform === item}
                      key={item}
                      onClick={() => setInstallPlatform(item)}
                    >
                      <span className="landing-install-platform-icon">
                        <PlatformIcon platform={item} />
                      </span>
                      <span>{t(`landing.install.${item}_label`)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="landing-install-command"
                id="landing-install-command"
                aria-live="polite"
              >
                <PublicCodeBlock
                  key={installPlatform}
                  label={t(`landing.install.${installPlatform}_command_label`)}
                  command={
                    installPlatform === "windows" ? WINDOWS_INSTALL_COMMAND : INSTALL_COMMAND
                  }
                  copyLabel={t("landing.install.copy")}
                  copiedLabel={t("landing.install.copied")}
                  copyFailedLabel={t("common.status.copy_failed")}
                />
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

        {/* La página terminaba en la caja de instalación y caía al pie: quien
          baja del todo es quien más interés tiene y no encontraba salida. */}
        <section className="landing-close" aria-labelledby="landing-close-title">
          <Reveal>
            <h2 id="landing-close-title">{t("landing.close.title")}</h2>
            <p>{t("landing.close.body")}</p>
            <div className="landing-close-actions">
              <a className="btn btn-primary" href={appPath("/register")}>
                {t("landing.header.cta_register")}
              </a>
              <a
                className="btn btn-ghost"
                href="https://github.com/iagentshub/iAgents"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("landing.close.repo")}
              </a>
            </div>
          </Reveal>
        </section>

        <PublicFooter path="/" billingEnabled={platform.data?.billing_enabled} />
      </PublicShell>
    </>
  );
}
