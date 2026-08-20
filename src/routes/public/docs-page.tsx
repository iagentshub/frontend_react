import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Seo } from "@/components/seo";
import { PublicCodeBlock } from "@/components/public-code-block";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicIcon, type PublicIconName } from "@/components/public-icons";
import { PublicShell, Reveal } from "@/components/public-motion";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/docs/docs.css";

const sections = [
  { id: "getting-started", key: "getting_started", icon: "getting_started" },
  { id: "installation", key: "installation", icon: "selfhosted" },
  { id: "agents", key: "agents", icon: "agents" },
  { id: "connections", key: "connections", icon: "connections" },
  { id: "llm-orchestration", key: "llm_orchestration", icon: "llm_orchestration" },
  { id: "skills", key: "skills", icon: "skills" },
  { id: "teams", key: "teams", icon: "teams" },
  { id: "workflows", key: "workflows", icon: "workflows" },
  { id: "official-resources", key: "official_resources", icon: "official_resources" },
  { id: "memory-knowledge", key: "memory_knowledge", icon: "memory_knowledge" },
  { id: "operations", key: "operations", icon: "dashboard" },
  { id: "troubleshooting", key: "troubleshooting", icon: "best_practices" },
  { id: "best-practices", key: "best_practices", icon: "best_practices" },
  { id: "keywords", key: "keywords", icon: "keywords" },
] as const satisfies ReadonlyArray<{ id: string; key: string; icon: PublicIconName }>;

type SectionKey = (typeof sections)[number]["key"];

const definitions: Record<Exclude<SectionKey, "keywords" | "getting_started">, string[]> = {
  installation: ["requirements", "docker", "windows", "modes"],
  agents: ["test", "export", "config", "memory", "routines"],
  connections: ["vs_accounts", "tokens"],
  llm_orchestration: ["modes", "balanced", "stack", "failover", "usage", "sharing"],
  skills: ["public", "private", "link"],
  teams: ["create", "invite", "share", "unshare", "badge", "guests"],
  workflows: ["graph", "execution", "gates", "groups"],
  official_resources: ["catalog", "sources", "tools", "safety", "updates"],
  memory_knowledge: ["memory", "knowledge"],
  operations: ["commands", "updates", "data", "health"],
  troubleshooting: ["first_checks", "logs", "providers", "security"],
  best_practices: ["prompt", "model", "skills", "knowledge", "memory", "temp"],
};

const glossaryTerms = [
  "agent",
  "llm",
  "llm_orchestration",
  "work_group",
  "workflow",
  "official_resource",
  "prompt",
  "connection",
  "provider",
  "skill",
  "memory",
  "knowledge",
  "token",
  "temperature",
  "context_window",
  "hallucination",
  "tools",
  "rag",
  "fine_tuning",
  "multimodal",
];

export function DocsPage() {
  useBodyClass("docs-page");
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -68%", threshold: 0 },
    );
    sections.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [query]);

  const visibleSections = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(i18n.language);
    if (!needle) return sections;
    return sections.filter(({ key }) =>
      sectionSearchText(key, t).toLocaleLowerCase(i18n.language).includes(needle),
    );
  }, [i18n.language, query, t]);

  const docsLanguage = i18n.language.startsWith("es") ? "es" : "en";
  const resources = [
    [
      "deployment",
      `https://github.com/iagentshub/iAgents/blob/main/docs/${docsLanguage}/operations.md`,
    ],
    [
      "backend",
      `https://github.com/iagentshub/iAgents/blob/main/backend_fastapi/docs/${docsLanguage}/api.md`,
    ],
    [
      "client",
      `https://github.com/iagentshub/iAgents/blob/main/app_flutter/docs/${docsLanguage}/index.md`,
    ],
  ] as const;

  return (
    <>
      <Seo
        title={t("seo.docs.title")}
        description={t("seo.docs.description")}
        path="/docs"
        localizedPath="/docs"
      />
      <PublicShell intensity="quiet">
        <PublicHeader variant="docs" path="/docs" />
        <div className="docs-shell">
          <aside className="docs-aside" aria-label={t("docs.page.index_label")}>
            <span className="docs-aside-title">{t("docs.page.index_label")}</span>
            <DocsIndex activeSection={activeSection} t={t} />
          </aside>

          <main className="docs-main">
            <details className="docs-mobile-index">
              <summary>{t("docs.page.index_label")}</summary>
              <DocsIndex activeSection={activeSection} t={t} />
            </details>

            <Reveal className="docs-hero" offset={16}>
              <span className="docs-eyebrow">{t("docs.page.eyebrow")}</span>
              <h1>{t("docs.page.title")}</h1>
              <p>{t("docs.page.subtitle")}</p>
              <label className="docs-search">
                <span className="sr-only">{t("docs.page.search_label")}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m16.2 16.2 4.3 4.3" />
                </svg>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("docs.page.search_placeholder")}
                  type="search"
                />
              </label>
            </Reveal>

            {!query && (
              <section className="docs-quick" aria-labelledby="docs-quick-title">
                <h2 id="docs-quick-title">{t("docs.quick.title")}</h2>
                <div className="docs-quick-grid">
                  {["getting_started", "installation", "agents", "troubleshooting"].map((key) => (
                    <a key={key} href={`#${key.replace("_", "-")}`}>
                      <strong>{t(`docs.quick.${key}_title`)}</strong>
                      <span>{t(`docs.quick.${key}_body`)}</span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            <div className="docs-content" aria-live="polite">
              {visibleSections.map(({ id, key, icon }) => (
                <section className="docs-section" id={id} key={id}>
                  <details open>
                    <summary>
                      <span className="docs-summary-icon">
                        <PublicIcon name={icon} />
                      </span>
                      <span>{t(`docs.sections.${key}`)}</span>
                    </summary>
                    <div className="docs-section-body">
                      <SectionContent section={key} t={t} />
                    </div>
                  </details>
                </section>
              ))}
              {visibleSections.length === 0 && (
                <p className="docs-empty">{t("docs.page.no_results")}</p>
              )}
            </div>

            {!query && (
              <section className="docs-resources" aria-labelledby="docs-resources-title">
                <h2 id="docs-resources-title">{t("docs.resources.title")}</h2>
                <p>{t("docs.resources.subtitle")}</p>
                <div className="docs-resource-grid">
                  {resources.map(([key, href]) => (
                    <a href={href} key={key} target="_blank" rel="noreferrer">
                      <strong>{t(`docs.resources.${key}_title`)}</strong>
                      <span>{t(`docs.resources.${key}_body`)}</span>
                      <small>{t("docs.resources.action")} ↗</small>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
        <PublicFooter path="/docs" />
      </PublicShell>
    </>
  );
}

function sectionSearchText(section: SectionKey, t: TFunction) {
  const base = [t(`docs.nav.${section}`), t(`docs.sections.${section}`)];
  if (section === "keywords")
    glossaryTerms.forEach((term) =>
      base.push(t(`docs.keywords.${term}_title`), t(`docs.keywords.${term}_body`)),
    );
  else if (section === "getting_started") {
    base.push(t("docs.getting_started.intro"));
    [1, 2, 3].forEach((step) =>
      base.push(
        t(`docs.getting_started.step${step}_title`),
        t(`docs.getting_started.step${step}_body`),
      ),
    );
  } else
    definitions[section].forEach((item) =>
      base.push(t(`docs.${section}.${item}_title`), t(`docs.${section}.${item}_body`)),
    );
  return base.join(" ");
}

function SectionContent({ section, t }: { section: SectionKey; t: TFunction }) {
  if (section === "keywords")
    return (
      <div className="docs-glossary">
        {glossaryTerms.map((term) => (
          <Item
            key={term}
            title={t(`docs.keywords.${term}_title`)}
            body={t(`docs.keywords.${term}_body`)}
          />
        ))}
      </div>
    );
  if (section === "getting_started")
    return (
      <>
        <div className="docs-accounts">
          <strong>{t("docs.getting_started.accounts_title")}</strong>
          <Account
            type="registered"
            title={t("docs.getting_started.accounts_registered_title")}
            body={t("docs.getting_started.accounts_registered_body")}
          />
          <Account
            type="guest"
            title={t("docs.getting_started.accounts_guest_title")}
            body={t("docs.getting_started.accounts_guest_body")}
          />
        </div>
        <p className="docs-intro">{t("docs.getting_started.intro")}</p>
        <div className="docs-steps">
          {[1, 2, 3].map((step) => (
            <Step
              key={step}
              number={step}
              title={t(`docs.getting_started.step${step}_title`)}
              body={t(`docs.getting_started.step${step}_body`)}
            />
          ))}
        </div>
      </>
    );
  return (
    <>
      <p className="docs-intro">{t(`docs.${section}.intro`)}</p>
      {section === "installation" && (
        <PublicCodeBlock
          command={
            "git clone https://github.com/iagentshub/iAgents.git\ncd iAgents\npython gaia.py install"
          }
          label={t("docs.installation.command_label")}
          copyLabel={t("landing.install.copy")}
          copiedLabel={t("landing.install.copied")}
          copyFailedLabel={t("common.status.copy_failed")}
          variant="console"
          multiline
        />
      )}
      <div className="docs-items">
        {definitions[section].map((item) => (
          <Item
            key={item}
            title={t(`docs.${section}.${item}_title`)}
            body={t(`docs.${section}.${item}_body`)}
          />
        ))}
      </div>
    </>
  );
}

function DocsIndex({ activeSection, t }: { activeSection: string; t: TFunction }) {
  return (
    <nav>
      {sections.map(({ id, key }) => (
        <a key={id} href={`#${id}`} aria-current={activeSection === id ? "location" : undefined}>
          {t(`docs.nav.${key}`)}
        </a>
      ))}
    </nav>
  );
}

function Item({ title, body }: { title: string; body: string }) {
  return (
    <div className="docs-item">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}
function Step({ number, title, body }: { number: number; title: string; body: string }) {
  return (
    <div className="docs-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
function Account({
  type,
  title,
  body,
}: {
  type: "registered" | "guest";
  title: string;
  body: string;
}) {
  return (
    <div className={`docs-account docs-account--${type}`}>
      <span aria-hidden="true">{type === "registered" ? "✓" : "○"}</span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
