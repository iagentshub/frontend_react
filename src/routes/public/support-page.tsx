import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { sessionQuery } from "@/auth/queries";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/support/support.css";

const faqs = ["account", "provider", "selfhosted", "response"] as const;

export function SupportPage() {
  useBodyClass("support-page");
  const { t, i18n } = useTranslation();
  const session = useQuery(sessionQuery);
  const authenticated = Boolean(session.data?.username);

  return (
    <>
      <title>iAgents Hub · {t("support.page.title")}</title>
      <header className="support-header">
        <Link className="support-logo" to="/">iAgents<span>Hub</span></Link>
        <div className="support-header-divider" />
        <span className="support-header-label">{t("support.page.title")}</span>
        <div className="support-header-spacer" />
        <button className="support-header-lang" onClick={() => void i18n.changeLanguage(i18n.language === "es" ? "en" : "es")}>
          {i18n.language.toUpperCase()}
        </button>
        <Link to={authenticated ? "/dashboard/" : "/login/"} className="support-header-action">
          {authenticated ? `← ${t("support.header.dashboard")}` : t("support.header.login")}
        </Link>
      </header>

      <main className="support-main">
        <section className="support-hero">
          <span className="support-eyebrow">{t("support.page.eyebrow")}</span>
          <h1>{t("support.page.heading")}</h1>
          <p>{t("support.page.subtitle")}</p>
        </section>

        <section aria-labelledby="support-channels-title">
          <h2 className="support-section-title" id="support-channels-title">{t("support.channels.title")}</h2>
          <div className="support-channel-grid">
            <SupportCard
              icon="docs"
              title={t("support.channels.docs_title")}
              body={t("support.channels.docs_body")}
              action={t("support.channels.docs_action")}
              to="/docs"
            />
            <SupportCard
              icon="email"
              title={t("support.channels.email_title")}
              body={t("support.channels.email_body")}
              action={t("support.channels.email_action")}
              href="mailto:hola@iagentshub.com?subject=Soporte%20iAgents%20Hub"
            />
            <SupportCard
              icon="github"
              title={t("support.channels.github_title")}
              body={t("support.channels.github_body")}
              action={t("support.channels.github_action")}
              href="https://github.com/iagentshub/iAgents/issues"
              external
            />
          </div>
        </section>

        <aside className="support-notice">
          <SupportIcon kind="shield" />
          <div><strong>{t("support.before.title")}</strong><p>{t("support.before.body")}</p></div>
        </aside>

        <section aria-labelledby="support-faq-title">
          <h2 className="support-section-title" id="support-faq-title">{t("support.faq.title")}</h2>
          <div className="support-faq">
            {faqs.map((item) => (
              <details key={item}>
                <summary>{t(`support.faq.${item}_q`)}</summary>
                <p>{t(`support.faq.${item}_a`)}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function SupportCard({ icon, title, body, action, to, href, external }: {
  icon: "docs" | "email" | "github";
  title: string;
  body: string;
  action: string;
  to?: string;
  href?: string;
  external?: boolean;
}) {
  const content = <>{action}<span aria-hidden="true">→</span></>;
  return (
    <article className="support-channel-card">
      <span className="support-channel-icon"><SupportIcon kind={icon} /></span>
      <h3>{title}</h3>
      <p>{body}</p>
      {to
        ? <Link className="support-channel-action" to={to}>{content}</Link>
        : <a className="support-channel-action" href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>{content}</a>}
    </article>
  );
}

function SupportIcon({ kind }: { kind: "docs" | "email" | "github" | "shield" }) {
  if (kind === "docs") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5a3 3 0 0 1 3-2h6v18H6a3 3 0 0 0-3 2V5zM21 5a3 3 0 0 0-3-2h-6v18h6a3 3 0 0 1 3 2V5z" /></svg>;
  if (kind === "email") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
  if (kind === "github") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8a10.2 10.2 0 0 0-3.2 19.9c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.3-.3-4.7-1.1-4.7-5a3.9 3.9 0 0 1 1.1-2.8c-.1-.3-.5-1.3.1-2.8 0 0 .8-.3 2.8 1.1a9.7 9.7 0 0 1 5.1 0c2-1.4 2.8-1.1 2.8-1.1.6 1.5.2 2.5.1 2.8a3.9 3.9 0 0 1 1.1 2.8c0 3.9-2.4 4.7-4.7 5 .4.3.7 1 .7 1.9v2.5c0 .3.2.6.7.5A10.2 10.2 0 0 0 12 1.8z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 6v6c0 5 3.4 8.8 8 10 4.6-1.2 8-5 8-10V6l-8-4z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>;
}
