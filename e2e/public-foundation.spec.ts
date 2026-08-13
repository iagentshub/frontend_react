import { expect, test } from "@playwright/test";

const widths = [1440, 1280, 768, 390, 360];

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

test("la cabecera y los comandos no desbordan en los anchos de referencia", async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.locator('a[href="/app/login"]').first()).toBeVisible();
    await expect(page.locator('a[href="/app/register"]').first()).toBeVisible();

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
      codeBlocks: [...document.querySelectorAll<HTMLElement>(".public-code-block-code")].map(
        (element) => ({ client: element.clientWidth, scroll: element.scrollWidth }),
      ),
    }));

    expect(layout.page, `overflow horizontal a ${width}px`).toBe(layout.viewport);
    expect(layout.codeBlocks).toHaveLength(3);
    expect(layout.codeBlocks.every(({ client, scroll }) => scroll >= client)).toBe(true);
  }
});
