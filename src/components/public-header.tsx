import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { appPath } from "@/app/app-paths";
import type { SupportedLanguage } from "@/i18n";
import { usePublicNavigation, type PublicBasePath } from "@/i18n/public-paths";

type PublicHeaderVariant = "about" | "docs" | "landing" | "legal" | "pr" | "support";

const publicNavigation = [
  ["/", "home"],
  ["/about", "about"],
  ["/docs", "docs"],
  ["/pricing/", "pricing"],
  ["/support", "support"],
] as const satisfies ReadonlyArray<readonly [PublicBasePath, string]>;

const languageNames: Record<SupportedLanguage, string> = {
  es: "Español",
  en: "English",
};

function LanguageSelector({
  language,
  onSelect,
  label,
}: {
  language: SupportedLanguage;
  onSelect: (language: SupportedLanguage) => Promise<void>;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const chooseLanguage = async (nextLanguage: SupportedLanguage) => {
    setOpen(false);
    await onSelect(nextLanguage);
  };

  return (
    <div className="public-language-selector" ref={rootRef}>
      <button
        className="public-language-trigger"
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg className="public-language-globe" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21M12 3C9.6 5.5 8.4 8.5 8.4 12s1.2 6.5 3.6 9" />
        </svg>
        <span>{language.toUpperCase()}</span>
        <svg className="public-language-chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="m2.5 4.5 3.5 3 3.5-3" />
        </svg>
      </button>

      {open ? (
        <div className="public-language-menu" role="menu" aria-label={label}>
          {(["es", "en"] as const).map((option) => (
            <button
              key={option}
              className="public-language-option"
              type="button"
              role="menuitemradio"
              aria-checked={language === option}
              onClick={() => void chooseLanguage(option)}
            >
              {languageNames[option]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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
  const hasInteriorActions = variant !== "landing" && variant !== "pr";
  const { language, publicLink, selectLanguage } = usePublicNavigation(i18n, path);

  return (
    <header className={`public-header ${variant}-header`}>
      <Link className={`public-logo ${variant}-logo`} to={publicLink("/")}>
        {t("common.brand.prefix")}
        <span>{t("common.brand.suffix")}</span>
      </Link>

      <PublicNavigation billingEnabled={billingEnabled} className={`${variant}-nav`} />

      <div
        className={`${hasInteriorActions ? "public-header-spacer " : ""}${variant}-header-spacer`}
      />

      {variant === "landing" ? (
        <>
          <LanguageSelector
            language={language}
            onSelect={selectLanguage}
            label={t("common.footer.change_language")}
          />
          <a className="btn btn-ghost btn-sm public-header-login" href={appPath("/login")}>
            {t("about.header.login")}
          </a>
          <a className="btn btn-primary btn-sm" href={appPath("/register")}>
            {t("landing.header.cta_register")}
          </a>
        </>
      ) : variant === "pr" ? (
        <>
          <LanguageSelector
            language={language}
            onSelect={selectLanguage}
            label={t("common.footer.change_language")}
          />
          <a href={appPath("/login")} className="btn btn-ghost btn-sm public-header-login">
            {t("pricing.nav_login")}
          </a>
          <a href={appPath("/register")} className="pr-header-cta">
            {t("pricing.nav_cta")}
          </a>
        </>
      ) : (
        <>
          <LanguageSelector
            language={language}
            onSelect={selectLanguage}
            label={t("common.footer.change_language")}
          />

          <a href={appPath("/login")} className="btn btn-ghost btn-sm public-header-login">
            {t("about.header.login")}
          </a>
        </>
      )}
    </header>
  );
}
