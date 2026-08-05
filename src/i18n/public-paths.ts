import type { i18n as I18n } from "i18next";
import { useNavigate } from "react-router-dom";
import type { SupportedLanguage } from "./index";

export const publicBasePaths = [
  "/",
  "/about",
  "/pricing/",
  "/docs",
  "/support",
  "/privacy",
  "/terms",
] as const;
export type PublicBasePath = (typeof publicBasePaths)[number];

export function localizedPublicPath(path: PublicBasePath, language: SupportedLanguage): string {
  if (language === "es") return path;
  return path === "/" ? "/en/" : `/en${path}`;
}

export function usePublicNavigation(i18n: I18n, currentPath: PublicBasePath) {
  const navigate = useNavigate();
  const language: SupportedLanguage = i18n.resolvedLanguage === "en" ? "en" : "es";
  const publicLink = (path: PublicBasePath) => localizedPublicPath(path, language);
  const switchLanguage = async () => {
    const nextLanguage: SupportedLanguage = language === "es" ? "en" : "es";
    await i18n.changeLanguage(nextLanguage);
    void navigate(localizedPublicPath(currentPath, nextLanguage));
  };

  return { language, publicLink, switchLanguage };
}
