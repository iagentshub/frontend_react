import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicIcon, type PublicIconName } from "@/components/public-icons";
import { AgentNetwork } from "@/components/agent-network";
import { PublicShell, Reveal, Stagger } from "@/components/public-motion";
import { usePublicNavigation } from "@/i18n/public-paths";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/about/about.css";

const features = [
  "groups",
  "multi_agent",
  "providers",
  "selfhosted",
  "knowledge",
  "skills",
  "dashboard",
  "centinel",
  "export",
];
const stack = [
  ["python", "Python"],
  ["fastapi", "FastAPI"],
  ["sqlite", "SQLite"],
  ["postgresql", "PostgreSQL"],
  ["nginx", "Nginx"],
  ["docker", "Docker"],
  ["typescript", "TypeScript"],
  ["flutter", "Flutter"],
] as const;
const creators = [
  {
    name: "Andrés David Hernández Rocamora",
    github: "https://github.com/andresdavidhr",
    username: "andresdavidhr",
  },
  { name: "Javier Miralles", github: "https://github.com/Jariviii", username: "Jariviii" },
];

export function AboutPage() {
  useBodyClass("about-page");
  const { t, i18n } = useTranslation();
  const { publicLink } = usePublicNavigation(i18n, "/about");

  return (
    <>
      <Seo
        title={t("seo.about.title")}
        description={t("seo.about.description")}
        path="/about"
        localizedPath="/about"
      />

      <PublicShell>
        <PublicHeader variant="about" path="/about" />

        <main className="about-main">
          <div className="about-hero">
            <Reveal className="about-hero-copy">
              <div className="about-hero-badge">{t("common.brand.full")}</div>

              <h1 className="about-hero-title">{t("about.description.title")}</h1>

              <p className="about-hero-body">{t("about.description.body")}</p>
            </Reveal>

            <Reveal className="about-hero-network" delay={0.12} offset={16}>
              <AgentNetwork compact />
            </Reveal>
          </div>

          <div className="about-sections">
            {/* Estas tres secciones no van en tarjeta: su contenido ya son
              tarjetas. Una caja dentro de otra caja no aporta jerarquía. */}
            <section className="about-section">
              <h2 className="about-section-title">{t("about.features.title")}</h2>
              <p className="about-section-lead">{t("about.features.body")}</p>

              <Stagger className="about-features-grid">
                {features.map((feature) => (
                  <div className="about-feature" key={feature}>
                    <span className="about-feature-icon">
                      <PublicIcon name={feature as PublicIconName} />
                    </span>
                    <div className="about-feature-title">
                      {t(`landing.features.${feature}_title`)}
                    </div>
                    <div className="about-feature-body">
                      {t(`landing.features.${feature}_body`)}
                    </div>
                  </div>
                ))}
              </Stagger>
            </section>

            <section className="about-section">
              <h2 className="about-section-title">{t("about.stack.title")}</h2>

              <Stagger className="about-stack-grid" step={0.04}>
                {stack.map(([key, label]) => (
                  <div className="about-stack-item" key={key}>
                    <strong className="about-stack-name">{label}</strong>
                    <span className="about-stack-desc">{t(`about.stack.${key}`)}</span>
                  </div>
                ))}
              </Stagger>
            </section>

            <section className="about-section">
              <h2 className="about-section-title">{t("about.creators.title")}</h2>

              <div className="about-creators-grid">
                {creators.map((creator) => (
                  <div className="about-creator" key={creator.username}>
                    <img
                      className="about-creator-avatar about-creator-avatar--img"
                      src={`https://avatars.githubusercontent.com/${creator.username}?s=80`}
                      alt={t("about.creators.avatar_alt")}
                    />
                    <div className="about-creator-info">
                      <strong className="about-creator-name">{creator.name}</strong>
                      <span className="about-creator-role">{t("about.creators.role")}</span>
                    </div>
                    <a
                      href={creator.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="about-creator-gh"
                      title={t("common.github")}
                      aria-label={`${creator.name} GitHub`}
                    >
                      <GitHubIcon />
                    </a>
                  </div>
                ))}
              </div>
            </section>

            <section className="about-card about-card-contact">
              <h2 className="about-card-title">{t("about.contact.title")}</h2>
              <p className="about-card-body">{t("about.contact.body")}</p>
              <Link className="about-contact-btn" to={publicLink("/support")}>
                <span>{t("about.contact.btn")}</span>
              </Link>
            </section>

            <div className="about-bottom-row">
              <section className="about-card about-card-github">
                <h2 className="about-card-title">{t("about.github.title")}</h2>
                <p className="about-card-body">{t("about.github.body")}</p>
                <a
                  href="https://github.com/iagentshub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-github-btn"
                >
                  <GitHubIcon />
                  <span>{t("about.github.label")}</span>
                </a>
              </section>

              <section className="about-card about-card-license">
                <h2 className="about-card-title">{t("about.license.title")}</h2>
                <p className="about-card-body">{t("about.license.body")}</p>
              </section>
            </div>
          </div>
        </main>
        <PublicFooter path="/about" />
      </PublicShell>
    </>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
