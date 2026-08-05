import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// @axe-core/playwright llevaba tiempo en package.json sin que lo usara nadie.
// Estas son las páginas públicas: las privadas viven en Flutter y no se pueden
// auditar desde aquí.
const PAGINAS = ["/", "/about", "/pricing/", "/docs", "/support", "/privacy", "/terms"];

// Solo se comprueban las reglas normativas (WCAG 2.1 A y AA). Las de
// "best-practice" de axe incluyen criterios discutibles que convertirían esto
// en una fuente de ruido en vez de una verja.
const NORMAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("ga-theme", "dark-blue");
    localStorage.setItem("ga-lang", "es");
  });
  await page.route("**/api/settings/platform/public", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ billing_enabled: true, landing_enabled: true }),
    }),
  );
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
});

for (const ruta of PAGINAS) {
  test(`${ruta} no tiene incumplimientos de WCAG A/AA`, async ({ page }) => {
    await page.goto(ruta);
    const { violations } = await new AxeBuilder({ page }).withTags(NORMAS).analyze();

    // El mensaje trae la regla y el selector porque el informe por defecto de
    // Playwright solo enseña "esperaba 0, había 3", que no dice dónde mirar.
    const detalle = violations
      .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target).join(", ")}`)
      .join("\n");
    expect(violations, `\n${detalle}`).toEqual([]);
  });
}
