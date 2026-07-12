import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { sessionQuery } from "@/auth/queries";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/docs/docs.css";

const sections = [
  ["keywords", "keywords"], ["getting-started", "getting_started"], ["agents", "agents"],
  ["connections", "connections"], ["skills", "skills"], ["teams", "teams"],
  ["folders", "folders"], ["memory-knowledge", "memory_knowledge"], ["best-practices", "best_practices"],
] as const;
type SectionKey = (typeof sections)[number][1];

export function DocsPage() {
  useBodyClass("docs-page");
  const { t, i18n } = useTranslation();
  const session = useQuery(sessionQuery);
  const [open, setOpen] = useState<string | null>(null);
  const authenticated = Boolean(session.data?.username);

  const openSection = (id: string) => {
    setOpen(id);
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return <>
    <title>iAgents Hub · {t("docs.page.title")}</title>
    <header className="docs-header">
      <Link className="docs-logo" to="/">iAgents<span>Hub</span></Link><div className="docs-header-divider" /><span className="docs-header-label">{t("docs.page.title")}</span><div className="docs-header-spacer" />
      <button className="docs-header-lang" onClick={() => void i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}>{i18n.language.toUpperCase()}</button>
      <Link to={authenticated ? "/dashboard/" : "/login/"} className="docs-header-action">{authenticated ? "← Dashboard" : t("about.header.login")}</Link>
    </header>
    <div className="docs-shell">
      <aside className="docs-aside"><nav>{sections.map(([id, key]) => <a key={id} href={`#${id}`} className={`docs-nav-link${open === id ? " active" : ""}`} onClick={(event) => { event.preventDefault(); openSection(id); }}>{t(`docs.nav.${key}`)}</a>)}</nav></aside>
      <main className="docs-main">
        <div className="docs-hero"><h1>{t("docs.page.title")}</h1><p>{t("docs.page.subtitle")}</p></div>
        <div className="docs-content">{sections.map(([id, key]) => <section className="docs-section" id={id} key={id}><details open={open === id} onToggle={(event) => { if (event.currentTarget.open) setOpen(id); }}><summary>{t(`docs.sections.${key}`)}</summary><div className="docs-section-body"><SectionContent section={key} t={t} /></div></details></section>)}</div>
      </main>
    </div>
  </>;
}

function SectionContent({ section, t }: { section: SectionKey; t: TFunction }) {
  if (section === "keywords") {
    const terms = ["agent", "llm", "prompt", "connection", "provider", "skill", "memory", "knowledge", "token", "temperature", "context_window", "hallucination", "tools", "rag", "fine_tuning", "multimodal"];
    return <div className="docs-glossary">{terms.map((term) => <div className="docs-term" key={term}><strong>{t(`docs.keywords.${term}_title`)}</strong><p>{t(`docs.keywords.${term}_body`)}</p></div>)}</div>;
  }
  if (section === "getting_started") return <><div className="docs-accounts"><strong className="docs-accounts-title">{t("docs.getting_started.accounts_title")}</strong><Account type="registered" title={t("docs.getting_started.accounts_registered_title")} body={t("docs.getting_started.accounts_registered_body")} /><Account type="guest" title={t("docs.getting_started.accounts_guest_title")} body={t("docs.getting_started.accounts_guest_body")} /></div><p className="docs-intro">{t("docs.getting_started.intro")}</p><div className="docs-steps">{[1, 2, 3].map((step) => <Step key={step} title={t(`docs.getting_started.step${step}_title`)} body={t(`docs.getting_started.step${step}_body`)} />)}</div></>;
  const definitions: Record<Exclude<SectionKey, "keywords" | "getting_started">, string[]> = {
    agents: ["test", "export", "config", "memory", "routines"],
    connections: ["vs_accounts", "tokens"],
    skills: ["public", "private", "activate"],
    teams: ["create", "invite", "share", "unshare", "badge", "guests"],
    folders: ["create", "filter", "rename"],
    memory_knowledge: ["memory", "knowledge"],
    best_practices: ["prompt", "model", "skills", "knowledge", "memory", "temp"],
  };
  const items = definitions[section];
  return <><p className="docs-intro">{t(`docs.${section}.intro`)}</p>{items.map((item) => <Item key={item} title={t(`docs.${section}.${item}_title`)} body={t(`docs.${section}.${item}_body`)} />)}</>;
}

function Item({ title, body }: { title: string; body: string }) { return <div className="docs-item"><strong>{title}</strong><p>{body}</p></div>; }
function Step({ title, body }: { title: string; body: string }) { return <div className="docs-step"><strong>{title}</strong><p>{body}</p></div>; }
function Account({ type, title, body }: { type: "registered" | "guest"; title: string; body: string }) { return <div className={`docs-account docs-account--${type}`}><span className="docs-account-icon" aria-hidden="true">○</span><div><strong>{title}</strong><p>{body}</p></div></div>; }

