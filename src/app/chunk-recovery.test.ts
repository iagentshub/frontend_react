import { describe, expect, it } from "vitest";
import { shouldRecoverChunk } from "./chunk-recovery";

describe("chunk recovery", () => {
  it("recarga una pestaña que todavía no intentó recuperarse", () => {
    expect(shouldRecoverChunk(Number.NaN, 100_000)).toBe(true);
  });

  it("evita un bucle de recargas durante un minuto", () => {
    expect(shouldRecoverChunk(90_000, 100_000)).toBe(false);
    expect(shouldRecoverChunk(40_000, 100_000)).toBe(true);
  });
});
