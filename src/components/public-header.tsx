import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import { sessionQuery } from "@/api/public-queries";
import { usePublicNavigation, type PublicBasePath } from "@/i18n/public-paths";

type PublicHeaderVariant = "about" | "docs" | "landing" | "legal" | "pr" | "support";

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

export function PublicNavigation({
  billingEnabled = true,
  className = "",
}: {
  billingEnabled?: boolean;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { publicLink } = usePublicNavigation(i18n, "/");
  const currentPath = comparablePath(location.pathname);

  return (
    <nav
      className={`public-header-nav${className ? ` ${className}` : ""}`}
      aria-label={t("common.footer.product")}
    >
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
 * Única estructura de cabecera pública. Las variantes conservan únicamente
 * las diferencias reales de acción entre páginas interiores, landing y
 * pricing; la navegación, marca y semántica permanecen compartidas.
 */
export function PublicHeader({
  variant,
  path,
  billingEnabled = true,
}: {
  variant: PublicHeaderVariant;
  path: PublicBasePath;
  billingEnabled?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const usesSessionAction = variant !== "landing" && variant !== "pr";
  const session = useQuery({ ...sessionQuery, enabled: usesSessionAction });
  const { language, publicLink, switchLanguage } = usePublicNavigation(i18n, path);
  const authenticated = Boolean(session.data?.username);

  return (
    <header className={`public-header ${variant}-header`}>
      <Link className={`public-logo ${variant}-logo`} to={publicLink("/")}>
        {t("common.brand.prefix")}
        <span>{t("common.brand.suffix")}</span>
      </Link>

      <PublicNavigation billingEnabled={billingEnabled} className={`${variant}-nav`} />

      <div
        className={`${usesSessionAction ? "public-header-spacer " : ""}${variant}-header-spacer`}
      />

      {variant === "landing" ? (
        <>
          <a className="btn btn-ghost btn-sm" href={appPath("/login")}>
            {t("about.header.login")}
          </a>
          <a className="btn btn-primary btn-sm" href={appPath("/register")}>
            {t("landing.header.cta_register")}
          </a>
        </>
      ) : variant === "pr" ? (
        <>
          <a href={appPath("/login")} className="pr-header-link">
            {t("pricing.nav_login")}
          </a>
          <a href={appPath("/register")} className="pr-header-cta">
            {t("pricing.nav_cta")}
          </a>
        </>
      ) : (
        <>
          <button
            className={`public-header-lang ${variant}-header-lang`}
            type="button"
            onClick={() => void switchLanguage()}
            aria-label={t("common.footer.change_language")}
          >
            {language.toUpperCase()}
          </button>

          <a
            href={appPath(authenticated ? "/dashboard" : "/login")}
            className={`public-header-action ${variant}-header-action`}
          >
            {authenticated ? t("common.navigation.dashboard") : t("about.header.login")}
          </a>
        </>
      )}
    </header>
  );
}
