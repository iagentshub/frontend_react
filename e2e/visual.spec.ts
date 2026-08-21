import { expect, test } from "@playwright/test";

const publicRoutes = [
  ["landing", "/"],
  ["about", "/about"],
  ["docs", "/docs"],
  ["pricing", "/pricing/"],
  ["support", "/support"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
] as const;

for (const language of ["es", "en"] as const) {
  for (const theme of ["dark-blue", "light-blue"] as const) {
    test.describe(`${language}-${theme}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.route("https://fonts.googleapis.com/**", (route) =>
          route.fulfill({ status: 200, contentType: "text/css", body: "" }),
        );
        await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
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
          const localizedPath =
            language === "en" ? (path === "/" ? "/en/" : `/en${path}`) : path;
          await page.goto(localizedPath);
          await expect(page.locator("html")).toHaveAttribute("lang", language);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await expect(page).toHaveScreenshot(`${name}-${language}-${theme}.png`, {
            fullPage: true,
            animations: "disabled",
            maxDiffPixelRatio: 0.005,
            timeout: 15_000,
          });
        });
      }
    });
  }
}
