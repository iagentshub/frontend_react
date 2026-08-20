import { describe, expect, it } from "vitest";
import es from "../../../assets/locales/es/legal.json";
import en from "../../../assets/locales/en/legal.json";
import {
  findPlaceholders,
  hasPlaceholders,
  LEGAL_DOCUMENTS,
  type LegalDocument,
} from "./legal-model";

const LOCALES = { es, en } as const;
const DOCUMENTS = Object.keys(LEGAL_DOCUMENTS) as LegalDocument[];

describe("aviso de borrador", () => {
  it("detecta los huecos que solo puede rellenar el titular", () => {
    expect(hasPlaceholders(["Titular: [RAZÓN SOCIAL]"])).toBe(true);
    expect(hasPlaceholders(["Texto normal", "Otro párrafo"])).toBe(false);
  });

  // Sin esto el aviso podría quedarse puesto para siempre tras rellenar los
  // datos, que es justo lo contrario de lo que se busca.
  it("desaparece cuando no queda ningún corchete", () => {
    expect(hasPlaceholders(["Titular: iAgents Hub SL", "NIF: B12345678"])).toBe(false);
  });

  it("enumera los huecos sin repetirlos", () => {
    expect(
      findPlaceholders([
        "Titular: [RAZÓN SOCIAL]",
        "Escribe a [EMAIL DE PRIVACIDAD]",
        "Responde [EMAIL DE PRIVACIDAD] en [PLAZO]",
      ]),
    ).toEqual(["[RAZÓN SOCIAL]", "[EMAIL DE PRIVACIDAD]", "[PLAZO]"]);
    expect(findPlaceholders(["Titular: iAgents Hub SL"])).toEqual([]);
  });
});

describe("contenido legal", () => {
  // El fallo real es traducir una sección nueva al español y olvidarla en
  // inglés: la página no revienta, pinta la clave cruda.
  for (const document of DOCUMENTS) {
    const sections = LEGAL_DOCUMENTS[document].sections;

    it(`${document}: los dos idiomas traen las mismas secciones que pinta la página`, () => {
      for (const [language, locale] of Object.entries(LOCALES)) {
        const present = Object.keys(locale[document].sections);
        expect([...sections].sort(), `faltan secciones en ${language}`).toEqual(present.sort());
      }
    });

    it(`${document}: ninguna sección se queda sin título ni cuerpo`, () => {
      for (const [language, locale] of Object.entries(LOCALES)) {
        for (const section of sections) {
          const content = (locale[document].sections as Record<string, unknown>)[section] as {
            title?: string;
            body?: string;
          };
          expect(content.title, `${language}/${section} sin título`).toBeTruthy();
          expect(content.body, `${language}/${section} sin cuerpo`).toBeTruthy();
        }
      }
    });
  }
});
