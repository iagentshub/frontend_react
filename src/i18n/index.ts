import i18n, { type Resource, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";

export const supportedLanguages = ["es", "en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

type LocaleModule = { default: Record<string, unknown> } | Record<string, unknown>;
const localeModules = import.meta.glob<LocaleModule>("../../assets/locales/{es,en}/*.json", {
  eager: true,
});

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem("ga-lang");
  if (stored === "es" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}

function buildResources(): Resource {
  const resources: Resource = { es: {}, en: {} };
  for (const [path, localeModule] of Object.entries(localeModules)) {
    const match = path.match(/\/(es|en)\/([^/]+)\.json$/);
    if (!match) continue;
    const language = match[1] as SupportedLanguage;
    const namespace = match[2];
    if (!namespace) continue;
    resources[language]![namespace] = ("default" in localeModule
      ? localeModule.default
      : localeModule) as ResourceKey;
  }
  return resources;
}

const initialLanguage = detectLanguage();

await i18n.use(initReactI18next).init({
  resources: buildResources(),
  lng: initialLanguage,
  fallbackLng: "es",
  supportedLngs: [...supportedLanguages],
  defaultNS: "common",
  nsSeparator: ".",
  keySeparator: ".",
  ns: [
    "common",
    "agents",
    "skills",
    "connections",
    "auth",
    "memory",
    "profile",
    "admin",
    "dashboard",
    "docs",
    "about",
    "support",
    "teams",
    "manager",
    "social",
    "explore",
    "labels",
    "pricing",
    "landing",
  ],
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

document.documentElement.lang = initialLanguage;

i18n.on("languageChanged", (language) => {
  if (language !== "es" && language !== "en") return;
  localStorage.setItem("ga-lang", language);
  document.documentElement.lang = language;
});

export default i18n;
