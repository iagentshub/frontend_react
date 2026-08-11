import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { sessionQuery } from "@/api/public-queries";
import { usePublicNavigation, type PublicBasePath } from "@/i18n/public-paths";

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
  label,
  path,
}: {
  /** Prefijo de clase CSS de la página: "about" | "docs" | "support". */
  variant: string;
  /** Texto de la etiqueta junto al logo (ya traducido). */
  label: string;
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

      <div className={`public-header-divider ${variant}-header-divider`} />

      <span className={`public-header-label ${variant}-header-label`}>{label}</span>

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
