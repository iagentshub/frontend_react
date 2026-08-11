import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Seo } from "@/components/seo";
import { PublicHeader } from "@/components/public-header";
import { PublicIcon } from "@/components/public-icons";
import { usePublicNavigation } from "@/i18n/public-paths";
import { hasPlaceholders, LEGAL_DOCUMENTS, type LegalDocument } from "./legal-model";
import { useBodyClass } from "./use-body-class";
import "@/styles/routes/legal/legal.css";

/**
 * Privacidad y Términos comparten estructura entera —cabecera, intro, lista de
 * secciones numeradas— y solo se diferencian en qué secciones traen. Un
 * componente con el documento como parámetro en vez de dos ficheros gemelos.
 */
function paragraphs(body: string): string[] {
  return body.split("\n\n").filter((paragraph) => paragraph.trim().length > 0);
}

export function LegalPage({ document }: { document: LegalDocument }) {
  useBodyClass("legal-page");
  const { t, i18n } = useTranslation();
  const { path, other, sections } = LEGAL_DOCUMENTS[document];
  const { publicLink } = usePublicNavigation(i18n, path);

  const key = (suffix: string) => `legal.${document}.${suffix}`;
  const itemsOf = (section: string): string[] => {
    const raw: unknown = t(key(`sections.${section}.items`), {
      returnObjects: true,
      defaultValue: [],
    });
    return Array.isArray(raw) ? (raw as string[]) : [];
  };
  const stringsOf = (section: string) => [
    t(key(`sections.${section}.title`)),
    t(key(`sections.${section}.body`)),
    ...itemsOf(section),
  ];

  const everyString = [t(key("intro")), t(key("updated")), ...sections.flatMap(stringsOf)];

  return (
    <>
      <Seo
        title={t(`seo.${document}.title`)}
        description={t(`seo.${document}.description`)}
        path={path}
        localizedPath={path}
      />

      <PublicHeader variant="legal" label={t(key("page_title"))} path={path} />

      <main className="legal-main">
        <article className="legal-doc">
          <h1 className="legal-title">
            <span className="legal-title-icon">
              <PublicIcon name="legal" />
            </span>
            {t(key("title"))}
          </h1>

          <p className="legal-updated">
            {t("legal.updated_label")}: {t(key("updated"))}
          </p>

          {hasPlaceholders(everyString) && (
            <p className="legal-draft" role="note">
              {t("legal.draft_notice")}
            </p>
          )}

          <p className="legal-intro">{t(key("intro"))}</p>

          {sections.map((section) => {
            const items = itemsOf(section);
            return (
              <section className="legal-section" key={section}>
                <h2 className="legal-section-title">{t(key(`sections.${section}.title`))}</h2>

                {paragraphs(t(key(`sections.${section}.body`))).map((paragraph) => (
                  <p className="legal-body" key={paragraph.slice(0, 40)}>
                    {paragraph}
                  </p>
                ))}

                {items.length > 0 && (
                  <ul className="legal-list">
                    {items.map((item) => (
                      <li key={item.slice(0, 40)}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <nav className="legal-nav">
            <Link to={publicLink(LEGAL_DOCUMENTS[other].path)}>{t(`legal.${other}.title`)}</Link>
            <Link to={publicLink("/")}>{t("legal.back")}</Link>
          </nav>
        </article>
      </main>
    </>
  );
}

export function PrivacyPage() {
  return <LegalPage document="privacy" />;
}

export function TermsPage() {
  return <LegalPage document="terms" />;
}
