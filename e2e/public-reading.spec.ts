import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("ga-theme", "dark-blue");
    localStorage.setItem("ga-lang", "es");
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
});

test("documentación conserva navegación, búsqueda y copia", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs");

  await expect(page.locator(".docs-mobile-index")).toBeVisible();
  await page.locator(".docs-mobile-index summary").click();
  await expect(page.locator('.docs-mobile-index a[href="#installation"]')).toBeVisible();

  const copy = page.locator(".public-code-block-copy");
  await copy.click();
  await expect(copy).toHaveAccessibleName(/Copiado|No se pudo copiar/);

  await page.getByRole("searchbox").fill("resultado imposible 123");
  await expect(page.getByText(/No encontramos una sección/)).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 390);
});

for (const path of ["/docs", "/privacy", "/terms"]) {
  test(`${path} mantiene lectura y accesibilidad en móvil`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(path);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
    await expect(page.locator(".public-footer")).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(violations).toEqual([]);
  });
}

for (const path of ["/privacy", "/terms"]) {
  test(`${path} mantiene la navegación alineada dentro de la cabecera`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await expect(page.locator(".legal-title")).toBeVisible();

    const layout = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".legal-header")!.getBoundingClientRect();
      const logo = document.querySelector<HTMLElement>(".legal-logo")!.getBoundingClientRect();
      const navigation = document.querySelector<HTMLElement>(".legal-nav")!.getBoundingClientRect();
      return {
        headerHeight: header.height,
        logoCenter: logo.top + logo.height / 2,
        navigationCenter: navigation.top + navigation.height / 2,
      };
    });

    expect(layout.headerHeight).toBeLessThanOrEqual(72);
    expect(Math.abs(layout.logoCenter - layout.navigationCenter)).toBeLessThanOrEqual(2);
    await expect(page.locator(".legal-document-nav")).toBeVisible();
  });
}
