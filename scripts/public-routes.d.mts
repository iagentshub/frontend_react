export type PublicLanguage = "es" | "en";

export type PublicPagePair = {
  key: string;
  es: string;
  en: string;
  sources: Record<PublicLanguage, string[]>;
};

export const publicPagePairs: PublicPagePair[];
export const publicRoutes: Array<{
  path: string;
  language: PublicLanguage;
  alternates: Record<PublicLanguage, string>;
}>;
