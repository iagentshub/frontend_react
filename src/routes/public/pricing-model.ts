/**
 * Modelo de precios — la aritmética de la calculadora, sin React.
 *
 * Vivía dentro de pricing-page.tsx, mezclada con el componente, y estaba
 * duplicada literalmente en ES5 en frontend_vanilla. Lógica de dinero sin un
 * solo assert: cambiar un precio obligaba a tocar dos ficheros en dos lenguajes
 * y nada detectaba que hubieran divergido. Aquí está sola y testeada.
 */

export const DEV_PRICE = 9;
export const BIZ_START = 7.5;
export const FLOOR = DEV_PRICE * 0.5; // €4.50
export const ENT_THRESHOLD = 100;
export const SH_MONTHLY = 400;
export const SH_ANNUAL = SH_MONTHLY * 10; // €4.000/año
export const MONTHS_ANNUAL = 10;
export const SLOPE = (BIZ_START - FLOOR) / (ENT_THRESHOLD - 1);

export type PlanKey = "free" | "rookie" | "developer" | "business" | "enterprise";
export type Tier1 = "rookie" | "developer";

/** Importe con símbolo, en formato español: €9 · €4,50 */
export function fmt(num: number): string {
  const r = Math.round(num * 100) / 100;
  return "€" + (r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace(".", ","));
}

/** Importe redondeado a entero, con punto de millares: €4.000 */
export function fmtInt(num: number): string {
  return "€" + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Precio por licencia según el número de asientos.
 *
 * Un asiento cuesta la tarifa de desarrollador. A partir de dos, el precio baja
 * linealmente desde BIZ_START y nunca por debajo de FLOOR.
 */
export function ppl(n: number): number {
  if (n <= 0) return 0;
  if (n === 1) return DEV_PRICE;
  return Math.max(FLOOR, BIZ_START - SLOPE * (n - 1));
}

/** Plan que corresponde a n asientos. */
export function planForN(n: number, tierAt1: Tier1): PlanKey {
  if (n <= 0) return "free";
  if (n === 1) return tierAt1;
  if (n <= ENT_THRESHOLD) return "business";
  return "enterprise";
}

export interface Totals {
  pricePerLic: number;
  monthlyTotal: number;
  annualTotal: number;
  /** Lo que se ahorra pagando el año por adelantado frente a 12 mensualidades. */
  saving: number;
}

/** Totales de la calculadora para n licencias, con o sin self-hosted. */
export function totals(n: number, selfHosted: boolean, annual: boolean): Totals {
  const shCost = selfHosted ? (annual ? SH_ANNUAL / MONTHS_ANNUAL : SH_MONTHLY) : 0;
  const pricePerLic = ppl(n);
  const monthlyBase = n * pricePerLic;
  const monthlyTotal = monthlyBase + shCost;
  const annualTotal = monthlyBase * MONTHS_ANNUAL + (selfHosted ? SH_ANNUAL : 0);
  return {
    pricePerLic,
    monthlyTotal,
    annualTotal,
    saving: monthlyTotal * 12 - annualTotal,
  };
}
