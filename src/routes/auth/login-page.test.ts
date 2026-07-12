import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirect("/agents/?page=2")).toBe("/agents/?page=2");
  });

  it("bloquea redirects externos y protocol-relative", () => {
    expect(safeRedirect("https://example.com")).toBe("/dashboard/");
    expect(safeRedirect("//example.com")).toBe("/dashboard/");
    expect(safeRedirect(null)).toBe("/dashboard/");
  });
});
