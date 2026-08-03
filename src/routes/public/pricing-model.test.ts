import { describe, expect, it } from "vitest";
import {
  BIZ_START,
  DEV_PRICE,
  ENT_THRESHOLD,
  FLOOR,
  MONTHS_ANNUAL,
  SH_ANNUAL,
  SH_MONTHLY,
  SLOPE,
  fmt,
  fmtInt,
  planForN,
  ppl,
  totals,
} from "./pricing-model";

describe("ppl — precio por licencia", () => {
  it("no cobra nada por cero o menos asientos", () => {
    expect(ppl(0)).toBe(0);
    expect(ppl(-3)).toBe(0);
  });

  it("cobra la tarifa de desarrollador a un solo asiento", () => {
    expect(ppl(1)).toBe(DEV_PRICE);
  });

  it("aplica ya un tramo de descuento en el segundo asiento", () => {
    // BIZ_START es el valor teórico de la curva en n=1, no el precio real de
    // n=2: la pendiente se aplica desde el segundo asiento.
    expect(ppl(2)).toBeCloseTo(BIZ_START - SLOPE, 10);
    expect(ppl(2)).toBeLessThan(BIZ_START);
    expect(ppl(2)).toBeLessThan(DEV_PRICE);
  });

  it("nunca baja del suelo, ni en el umbral ni muy por encima", () => {
    expect(ppl(ENT_THRESHOLD)).toBe(FLOOR);
    expect(ppl(ENT_THRESHOLD + 1)).toBe(FLOOR);
    expect(ppl(10_000)).toBe(FLOOR);
  });

  it("decrece de forma monótona entre 2 y el umbral", () => {
    for (let n = 3; n <= ENT_THRESHOLD; n++) {
      expect(ppl(n)).toBeLessThanOrEqual(ppl(n - 1));
    }
  });

  it("el descuento por volumen nunca hace que más asientos cuesten menos en total", () => {
    for (let n = 2; n <= ENT_THRESHOLD + 5; n++) {
      expect(n * ppl(n)).toBeGreaterThan((n - 1) * ppl(n - 1));
    }
  });
});

describe("planForN — plan según asientos", () => {
  it("sin asientos, plan gratuito", () => {
    expect(planForN(0, "developer")).toBe("free");
  });

  it("con un asiento respeta el tramo elegido", () => {
    expect(planForN(1, "rookie")).toBe("rookie");
    expect(planForN(1, "developer")).toBe("developer");
  });

  it("cambia a empresa justo al pasar el umbral, no antes", () => {
    expect(planForN(ENT_THRESHOLD, "developer")).toBe("business");
    expect(planForN(ENT_THRESHOLD + 1, "developer")).toBe("enterprise");
  });
});

describe("totals — importes de la calculadora", () => {
  it("sin self-hosted, el anual son 10 mensualidades", () => {
    const t = totals(5, false, false);
    expect(t.monthlyTotal).toBe(5 * ppl(5));
    expect(t.annualTotal).toBe(t.monthlyTotal * MONTHS_ANNUAL);
  });

  it("suma la cuota self-hosted mensual cuando se paga al mes", () => {
    expect(totals(3, true, false).monthlyTotal).toBe(3 * ppl(3) + SH_MONTHLY);
  });

  it("prorratea la cuota self-hosted anual cuando se paga al año", () => {
    expect(totals(3, true, true).monthlyTotal).toBe(3 * ppl(3) + SH_ANNUAL / MONTHS_ANNUAL);
  });

  it("pagar el año por adelantado siempre ahorra", () => {
    for (const n of [1, 2, 50, ENT_THRESHOLD, 250]) {
      expect(totals(n, false, false).saving).toBeGreaterThan(0);
    }
  });

  it("sin asientos ni self-hosted no hay nada que pagar", () => {
    const t = totals(0, false, false);
    expect(t.monthlyTotal).toBe(0);
    expect(t.annualTotal).toBe(0);
  });
});

describe("formato español", () => {
  it("omite los decimales cuando el importe es entero", () => {
    expect(fmt(9)).toBe("€9");
  });

  it("usa coma decimal", () => {
    expect(fmt(4.5)).toBe("€4,50");
    expect(fmt(7.25)).toBe("€7,25");
  });

  it("redondea a dos decimales", () => {
    expect(fmt(4.499)).toBe("€4,50");
  });

  it("usa punto de millares en los enteros", () => {
    expect(fmtInt(4000)).toBe("€4.000");
    expect(fmtInt(1234567)).toBe("€1.234.567");
    expect(fmtInt(999)).toBe("€999");
  });

  it("el precio del suelo se muestra como €4,50", () => {
    expect(fmt(FLOOR)).toBe("€4,50");
  });
});
