import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

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
});

test("Precios conserva comparación y layout en todos los anchos públicos", async ({ page }) => {
  for (const width of [1440, 1280, 768, 390, 360]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.goto("/pricing/");

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await expect(page.locator(".pr-card")).toHaveCount(5);
    await expect(page.locator(".pr-card--featured .pr-card-badge")).toBeVisible();
    await expect(page.locator(".public-footer")).toBeVisible();
  }
});

test("Precios mantiene selector, calculadora y accesibilidad", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.goto("/pricing/");

  const monthly = page.locator(".pr-price-monthly").first();
  const annual = page.locator(".pr-price-annual").first();
  await expect(monthly).toBeVisible();
  await expect(annual).toBeHidden();

  const annualToggle = page.locator(".pr-toggle-btn").nth(1);
  await annualToggle.focus();
  await expect(annualToggle).toBeFocused();
  await page.keyboard.press("Space");
  await expect(monthly).toBeHidden();
  await expect(annual).toBeVisible();

  await page.locator(".pr-open-plan-btn").click();
  await expect(page.locator(".pm-dialog")).toBeVisible();
  const closeCalculator = page.locator(".pm-close");
  await closeCalculator.focus();
  await expect(closeCalculator).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".pm-dialog")).toBeHidden();

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
