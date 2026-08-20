import type { PublicBasePath } from "@/i18n/public-paths";

/**
 * Estructura de los documentos legales, separada del componente igual que
 * pricing-model: el orden de las secciones es dato revisable sin abrir el JSX,
 * y así se puede comprobar contra los dos ficheros de locales en un test.
 */
export type LegalDocument = "privacy" | "terms";

export const PRIVACY_SECTIONS = [
  "controller",
  "data",
  "purposes",
  "providers",
  "recipients",
  "transfers",
  "retention",
  "rights",
  "security",
  "cookies",
  "minors",
  "changes",
  "contact",
] as const;

export const TERMS_SECTIONS = [
  "identification",
  "object",
  "service",
  "account",
  "acceptable_use",
  "content",
  "ai",
  "third_party",
  "plans",
  "billing",
  "withdrawal",
  "availability",
  "liability",
  "termination",
  "changes",
  "law",
] as const;

export const LEGAL_DOCUMENTS: Record<
  LegalDocument,
  { path: PublicBasePath; other: LegalDocument; sections: readonly string[] }
> = {
  privacy: { path: "/privacy", other: "terms", sections: PRIVACY_SECTIONS },
  terms: { path: "/terms", other: "privacy", sections: TERMS_SECTIONS },
};

/**
 * Los datos que solo puede aportar el titular —razón social, NIF, plazos de
 * conservación— van escritos entre corchetes. El aviso de borrador se pinta
 * mientras quede alguno, así que desaparece solo al rellenarlos: si dependiera
 * de una constante, el riesgo sería publicar con "[NIF]" y el aviso ya quitado.
 */
export function hasPlaceholders(values: readonly string[]): boolean {
  return values.some((value) => /\[[^\]]+\]/.test(value));
}

/**
 * El aviso genérico decía que faltaban datos pero no cuáles, así que había que
 * leerse el documento entero para encontrarlos. Devuelve los huecos, sin
 * repetir y en el orden en que aparecen.
 */
export function findPlaceholders(values: readonly string[]): string[] {
  const found = new Set<string>();
  for (const value of values) for (const match of value.matchAll(/\[[^\]]+\]/g)) found.add(match[0]);
  return [...found];
}
