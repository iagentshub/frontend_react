import { describe, expect, it } from "vitest";
import {
  BIZ_START,
  CARDS,
  ENT_THRESHOLD,
  MONTHS_ANNUAL,
  SH_ANNUAL,
  SH_MONTHLY,
  fmt,
  ppl,
} from "./pricing-model";
import table from "./published-prices.json";
import enPricing from "@/../assets/locales/en/pricing.json";
import esPricing from "@/../assets/locales/es/pricing.json";

/**
 * Los precios anunciados aquí tienen que ser los que cobra el backend.
 *
 * pricing-model.test.ts comprueba la aritmética contra SUS PROPIAS constantes:
 * subir DEV_PRICE de 9 a 12 pasaba entero, y también pasaba la suite del
 * backend, porque allí ocurre lo mismo. Nada relacionaba los dos números.
 *
 * `published-prices.json` son importes absolutos y es el mismo fichero, byte a
 * byte, que backend/tests/services/published-prices.json. Ver su cabecera.
 */

const RECORDATORIO =
  "Has cambiado la fórmula de precios. Actualiza published-prices.json en ESTE " +
  "repositorio y la copia idéntica de backend/tests/services/, o el precio " +
  "anunciado dejará de ser el cobrado.";

/** Céntimos que la calculadora anuncia para un caso de la tabla. */
function anunciadoEnCentimos(seats: number, interval: string, selfHosted: boolean): number {
  const base = seats * ppl(seats);
  if (interval === "year") {
    return Math.round(base * MONTHS_ANNUAL * 100) + (selfHosted ? SH_ANNUAL * 100 : 0);
  }
  return Math.round(base * 100) + (selfHosted ? SH_MONTHLY * 100 : 0);
}

describe("la calculadora anuncia los precios publicados", () => {
  for (const caso of table.casos) {
    const nombre = `${caso.tier} · ${caso.seats} · ${caso.interval}${caso.self_hosted ? " · self-hosted" : ""}`;

    it(`${nombre}: precio por licencia`, () => {
      expect(Math.round(ppl(caso.seats) * 100), RECORDATORIO).toBe(caso.price_per_seat_cents);
    });

    it(`${nombre}: importe total`, () => {
      expect(
        anunciadoEnCentimos(caso.seats, caso.interval, caso.self_hosted),
        RECORDATORIO,
      ).toBe(caso.amount_cents);
    });
  }

  it("el add-on self-hosted cuesta lo publicado", () => {
    expect(SH_MONTHLY * 100, RECORDATORIO).toBe(table.add_on_self_hosted_cents.month);
    expect(SH_ANNUAL * 100, RECORDATORIO).toBe(table.add_on_self_hosted_cents.year);
  });
});

/**
 * La tercera copia: las tarjetas de la página no salen del modelo, son cadenas
 * escritas a mano en CARDS. Nadie las miraba — se podía bajar FLOOR y seguir
 * anunciando «€4,50» que ya no se cobra.
 */
describe("las tarjetas anuncian lo que el modelo calcula", () => {
  const porId = Object.fromEntries(CARDS.map((card) => [card.id, card]));

  it("la tarjeta individual muestra el precio de un asiento", () => {
    expect(porId.dev?.monthly).toBe(fmt(ppl(1)));
    expect(porId.dev?.annual).toBe(fmt(ppl(1) * MONTHS_ANNUAL));
  });

  it("la tarjeta de empresa muestra el suelo, que es el precio en el umbral", () => {
    expect(porId.ent?.monthly).toBe(fmt(ppl(ENT_THRESHOLD)));
    expect(porId.ent?.annual).toBe(fmt(ppl(ENT_THRESHOLD) * MONTHS_ANNUAL));
  });

  it("el «desde» de Business es un precio que la curva alcanza de verdad", () => {
    // No es un valor derivado —es una cifra de marketing— pero no puede
    // prometer un precio por debajo del suelo ni por encima del de dos asientos.
    const desde = Number(porId.biz?.monthly?.replace("€", "").replace(",", "."));
    expect(desde).toBeLessThanOrEqual(ppl(2));
    expect(desde).toBeGreaterThanOrEqual(ppl(ENT_THRESHOLD));

    const alcanzable = Array.from({ length: ENT_THRESHOLD - 1 }, (_, i) => ppl(i + 2)).some(
      (precio) => Math.abs(precio - desde) < 0.5,
    );
    expect(alcanzable, `ningún número de asientos cuesta cerca de €${desde}`).toBe(true);
  });

  it("cada tarjeta con precio anual cobra MONTHS_ANNUAL mensualidades", () => {
    for (const card of CARDS) {
      if (!card.monthly || !card.annual) continue;
      const mes = Number(card.monthly.replace("€", "").replace(",", "."));
      const anio = Number(card.annual.replace("€", "").replace(",", "."));
      expect(anio, `${card.id}: el anual no son ${MONTHS_ANNUAL} mensualidades`).toBeCloseTo(
        mes * MONTHS_ANNUAL,
        2,
      );
    }
  });
});

/**
 * La cuarta copia: los importes escritos dentro de los textos traducidos.
 *
 * La página anunciaba el add-on self-hosted a «€4.800/año» (400 × 12) tres
 * secciones debajo de un «+€4.000/año» (400 × 10, que es lo que aplica la
 * fórmula), y un suelo de «€5» donde el resto de la página dice «€4,50».
 * Nadie los miraba porque son cadenas de traducción, no código.
 */
describe("los importes dentro de los textos coinciden con el modelo", () => {
  const locales = { es: esPricing, en: enPricing };

  /** Lee una clave del bundle. Los ficheros anidan, así que no son Record<string, string>. */
  const texto = (bundle: object, clave: string): string => {
    const valor = (bundle as Record<string, unknown>)[clave];
    if (typeof valor !== "string") throw new Error(`${clave} no es una cadena traducida`);
    return valor;
  };

  /** «€4.000» en español, «€4,000» en inglés — el separador de millares cambia. */
  const miles = (n: number, lang: "es" | "en") =>
    "€" + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, lang === "es" ? "." : ",");

  /** «€4,50» en español, «€4.50» en inglés. */
  const conDecimales = (n: number, lang: "es" | "en") =>
    "€" + (lang === "es" ? n.toFixed(2).replace(".", ",") : n.toFixed(2));

  for (const [lang, textos] of Object.entries(locales) as Array<["es" | "en", object]>) {
    it(`${lang}: el add-on self-hosted se anuncia a su precio real`, () => {
      expect(texto(textos, "addon_price"), RECORDATORIO).toBe(`€${SH_MONTHLY}`);
      expect(texto(textos, "addon_billing"), RECORDATORIO).toContain(miles(SH_ANNUAL, lang));
      expect(texto(textos, "calc_sh_monthly"), RECORDATORIO).toContain(`€${SH_MONTHLY}`);
      expect(texto(textos, "calc_sh_annual"), RECORDATORIO).toContain(miles(SH_ANNUAL, lang));
    });

    it(`${lang}: el precio mínimo que se menciona es el suelo real`, () => {
      const suelo = conDecimales(ppl(ENT_THRESHOLD), lang);
      for (const clave of ["calc_subtitle", "calc_ent_note", "scale_ent_desc"]) {
        expect(texto(textos, clave), `${clave}: ${RECORDATORIO}`).toContain(suelo);
      }
    });

    it(`${lang}: la tabla de escala baja de precio y no se sale de la curva`, () => {
      const filas = [1, 2, 3, 4].map((n) => ({
        mes: Number(texto(textos, `scale_row${n}_monthly`).replace("€", "").replace(",", ".")),
        anio: Number(texto(textos, `scale_row${n}_annual`).replace("€", "").replace(",", ".")),
      }));
      for (const [i, fila] of filas.entries()) {
        // BIZ_START, no ppl(2): la primera banda anuncia €7,50, que es donde
        // arranca la curva, no lo que cuesta el segundo asiento.
        expect(fila.mes).toBeLessThanOrEqual(BIZ_START);
        expect(fila.mes).toBeGreaterThanOrEqual(ppl(ENT_THRESHOLD));
        expect(fila.anio, `fila ${i + 1}: el anual no son ${MONTHS_ANNUAL} mensualidades`).toBeCloseTo(
          fila.mes * MONTHS_ANNUAL,
          2,
        );
        if (i > 0) expect(fila.mes).toBeLessThan(filas[i - 1]!.mes);
      }
    });
  }
});
