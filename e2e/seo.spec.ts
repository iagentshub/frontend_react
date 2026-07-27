import { expect, test } from "@playwright/test";

const site = "https://www.iagentshub.com";
const pages = [
  { path: "/", language: "es", es: "/", en: "/en/" },
  { path: "/en/", language: "en", es: "/", en: "/en/" },
  { path: "/about", language: "es", es: "/about", en: "/en/about" },
  { path: "/en/about", language: "en", es: "/about", en: "/en/about" },
  { path: "/pricing/", language: "es", es: "/pricing/", en: "/en/pricing/" },
  { path: "/en/pricing/", language: "en", es: "/pricing/", en: "/en/pricing/" },
  { path: "/docs", language: "es", es: "/docs", en: "/en/docs" },
  { path: "/en/docs", language: "en", es: "/docs", en: "/en/docs" },
  { path: "/support", language: "es", es: "/support", en: "/en/support" },
  { path: "/en/support", language: "en", es: "/support", en: "/en/support" },
] as const;

test.beforeEach(async ({ page }) => {
  // Las páginas públicas consultan estas dos rutas. Responderlas aquí hace que
  // la prueba mida SEO y no dependa de tener un backend levantado.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/settings/platform/public", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ landing_enabled: true, billing_enabled: true, registration: "open" }),
    }),
  );
});

for (const entry of pages) {
  test(`${entry.path} publica metadatos únicos y bilingües`, async ({ page }) => {
    await page.goto(entry.path);

    await expect(page.locator("html")).toHaveAttribute("lang", entry.language);
    await expect(page.locator("head title")).toHaveCount(1);
    await expect(page.locator('head meta[name="description"]')).toHaveCount(1);
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${site}${entry.path}`,
    );
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow, max-image-preview:large, max-snippet:-1",
    );
    await expect(page.locator('head link[rel="alternate"][hreflang="es"]')).toHaveAttribute(
      "href",
      `${site}${entry.es}`,
    );
    await expect(page.locator('head link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      `${site}${entry.en}`,
    );
    await expect(page.locator('head link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      `${site}${entry.es}`,
    );
  });
}

test("las rutas privadas y la página 404 no se indexan", async ({ page }) => {
  await page.goto("/login/");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );

  await page.goto("/esta-ruta-no-existe");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("404");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});
