import { expect, test } from "@playwright/test";

const publicRoutes = [
  ["landing", "/"],
  ["login", "/login/"],
  ["about", "/about"],
  ["docs", "/docs"],
  ["pricing", "/pricing/"],
] as const;

for (const language of ["es", "en"] as const) {
  for (const theme of ["dark-blue", "light-blue"] as const) {
    test.describe(`${language}-${theme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.addInitScript(
          ({ selectedLanguage, selectedTheme }) => {
            localStorage.setItem("ga-lang", selectedLanguage);
            localStorage.setItem("ga-theme", selectedTheme);
          },
          { selectedLanguage: language, selectedTheme: theme },
        );
        await page.route("**/api/auth/me", (route) =>
          route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
        );
        await page.route("**/api/settings/platform/public", (route) =>
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              guest_enabled: true,
              registration: "open",
              billing_enabled: true,
              landing_enabled: true,
            }),
          }),
        );
        await page.route("**/api/billing/plans", (route) =>
          route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
        );
      });

      for (const [name, path] of publicRoutes) {
        test(`${name} mantiene su referencia visual`, async ({ page }) => {
          await page.goto(path);
          await expect(page.locator("body")).toBeVisible();
          await expect(page).toHaveScreenshot(`${name}-${language}-${theme}.png`, {
            fullPage: true,
            animations: "disabled",
            maxDiffPixelRatio: 0.005,
          });
        });
      }
    });
  }
}

