import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Seo } from "@/components/seo";
import { PublicHeader } from "@/components/public-header";
import { PublicIcon } from "@/components/public-icons";
import { PublicShell, Reveal } from "@/components/public-motion";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/docs/docs.css";

const sections = [
  ["keywords", "keywords"],
  ["getting-started", "getting_started"],
  ["agents", "agents"],
  ["connections", "connections"],
  ["llm-orchestration", "llm_orchestration"],
  ["skills", "skills"],
  ["teams", "teams"],
  ["workflows", "workflows"],
  ["official-resources", "official_resources"],
  ["memory-knowledge", "memory_knowledge"],
  ["best-practices", "best_practices"],
] as const;
type SectionKey = (typeof sections)[number][1];

export function DocsPage() {
  useBodyClass("docs-page");
  const { t } = useTranslation();
  const [open, setOpen] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.location.hash.slice(1) || null,
  );

  const openSection = (id: string) => {
    setOpen(id);
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <>
      <Seo
        title={t("seo.docs.title")}
        description={t("seo.docs.description")}
        path="/docs"
        localizedPath="/docs"
      />

      <PublicShell intensity="quiet">
        <PublicHeader variant="docs" label={t("docs.page.title")} path="/docs" />

        <div className="docs-shell">
          <aside className="docs-aside">
            <nav>
              {sections.map(([id, key]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`docs-nav-link${open === id ? " active" : ""}`}
                  aria-current={open === id ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    openSection(id);
                  }}
                >
                  {t(`docs.nav.${key}`)}
                </a>
              ))}
            </nav>
          </aside>

          <main className="docs-main">
            <Reveal className="docs-hero" offset={16}>
              <h1>{t("docs.page.title")}</h1>
              <p>{t("docs.page.subtitle")}</p>
            </Reveal>

            <div className="docs-content">
              {sections.map(([id, key]) => (
                <section className="docs-section" id={id} key={id}>
                  <details
                    open={open === id}
                    onToggle={(event) => {
                      if (event.currentTarget.open) setOpen(id);
                    }}
                  >
                    <summary>
                      <span className="docs-summary-label">
                        <span className="docs-summary-icon">
                          <PublicIcon name={key} />
                        </span>
                        {t(`docs.sections.${key}`)}
                      </span>
                    </summary>
                    <div className="docs-section-body">
                      <SectionContent section={key} t={t} />
                    </div>
                  </details>
                </section>
              ))}
            </div>
          </main>
        </div>
      </PublicShell>
    </>
  );
}

function SectionContent({ section, t }: { section: SectionKey; t: TFunction }) {
  if (section === "keywords") {
    const terms = [
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
    return (
      <div className="docs-glossary">
        {terms.map((term) => (
          <div className="docs-term" key={term}>
            <strong>{t(`docs.keywords.${term}_title`)}</strong>
            <p>{t(`docs.keywords.${term}_body`)}</p>
          </div>
        ))}
      </div>
    );
  }
  if (section === "getting_started")
    return (
      <>
        <div className="docs-accounts">
          <strong className="docs-accounts-title">
            {t("docs.getting_started.accounts_title")}
          </strong>
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
              title={t(`docs.getting_started.step${step}_title`)}
              body={t(`docs.getting_started.step${step}_body`)}
            />
          ))}
        </div>
      </>
    );
  const definitions: Record<Exclude<SectionKey, "keywords" | "getting_started">, string[]> = {
    agents: ["test", "export", "config", "memory", "routines"],
    connections: ["vs_accounts", "tokens"],
    llm_orchestration: ["modes", "balanced", "stack", "failover", "usage", "sharing"],
    skills: ["public", "private", "activate"],
    teams: ["create", "invite", "share", "unshare", "badge", "guests"],
    workflows: ["graph", "execution", "gates", "groups"],
    official_resources: ["catalog", "sources", "tools", "safety", "updates"],
    memory_knowledge: ["memory", "knowledge"],
    best_practices: ["prompt", "model", "skills", "knowledge", "memory", "temp"],
  };
  const items = definitions[section];
  return (
    <>
      <p className="docs-intro">{t(`docs.${section}.intro`)}</p>
      {items.map((item) => (
        <Item
          key={item}
          title={t(`docs.${section}.${item}_title`)}
          body={t(`docs.${section}.${item}_body`)}
        />
      ))}
    </>
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
function Step({ title, body }: { title: string; body: string }) {
  return (
    <div className="docs-step">
      <strong>{title}</strong>
      <p>{body}</p>
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
      <span className="docs-account-icon" aria-hidden="true">
        ○
      </span>
      <div>
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
    </div>
  );
}
