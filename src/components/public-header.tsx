import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { sessionQuery } from "@/api/public-queries";
import { usePublicNavigation, type PublicBasePath } from "@/i18n/public-paths";

const publicNavigation = [
  ["/", "home"],
  ["/about", "about"],
  ["/docs", "docs"],
  ["/pricing/", "pricing"],
  ["/support", "support"],
] as const satisfies ReadonlyArray<readonly [PublicBasePath, string]>;

function comparablePath(path: string): string {
  const withoutLanguage = path.replace(/^\/en(?=\/)/, "");
  if (withoutLanguage === "/") return withoutLanguage;
  return withoutLanguage.replace(/\/$/, "");
}

export function PublicNavigation({ billingEnabled = true }: { billingEnabled?: boolean }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { publicLink } = usePublicNavigation(i18n, "/");
  const currentPath = comparablePath(location.pathname);

  return (
    <nav className="public-header-nav" aria-label={t("common.footer.product")}>
      {publicNavigation.map(([path, key]) => {
        if (path === "/pricing/" && !billingEnabled) return null;
        const active = comparablePath(path) === currentPath;
        return (
          <Link key={path} to={publicLink(path)} aria-current={active ? "page" : undefined}>
            {t(`common.navigation.${key}`)}
          </Link>
        );
      })}
      <a href="https://github.com/iagentshub/iAgents" target="_blank" rel="noopener noreferrer">
        {t("common.github")}
      </a>
    </nav>
  );
}

/**
 * Cabecera de las páginas públicas con selector de idioma.
 *
 * about, docs y support tenían este mismo bloque copiado, idéntico salvo el
 * prefijo de clase y la etiqueta. El prefijo se mantiene como prop porque el
 * CSS de las tres páginas NO es intercambiable —about es sticky, support tiene
 * otra altura y otro borde—, así que unificar también los estilos sería
 * rediseñarlas, no deduplicarlas.
 *
 * pricing y landing quedan fuera a propósito: su cabecera tiene otra forma
 * (pricing no lleva selector de idioma y sí tres enlaces; landing es solo logo
 * y acceso). Meterlas aquí exigiría un componente con más variantes que uso.
 */
export function PublicHeader({
  variant,
  path,
}: {
  /** Prefijo de clase CSS de la página: "about" | "docs" | "support". */
  variant: string;
  /** Ruta pública de la página, para que el cambio de idioma vuelva a ella. */
  path: PublicBasePath;
}) {
  const { t, i18n } = useTranslation();
  const session = useQuery(sessionQuery);
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, path);
  const authenticated = Boolean(session.data?.username);

  return (
    <header className={`public-header ${variant}-header`}>
      <Link className={`public-logo ${variant}-logo`} to={publicLink("/")}>
        {t("common.brand.prefix")}
        <span>{t("common.brand.suffix")}</span>
      </Link>

      <PublicNavigation />

      <div className={`public-header-spacer ${variant}-header-spacer`} />

      <button
        className={`public-header-lang ${variant}-header-lang`}
        onClick={() => void switchLanguage()}
      >
        {language.toUpperCase()}
      </button>

      <a
        href={appPath(authenticated ? "/dashboard" : "/login")}
        className={`public-header-action ${variant}-header-action`}
      >
        {/* La flecha viene dentro de la traducción ("← Dashboard"), no se añade aquí. */}
        {authenticated ? t("common.navigation.dashboard") : t("about.header.login")}
      </a>
    </header>
  );
}
