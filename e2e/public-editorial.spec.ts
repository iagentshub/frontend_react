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

for (const path of ["/about", "/support"]) {
  test(`${path} conserva acciones y layout en los anchos públicos`, async ({ page }) => {
    for (const width of [1440, 1280, 768, 390, 360]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
      await page.goto(path);

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(page.locator(".public-footer")).toBeVisible();
      await expect(
        page.getByRole("banner").getByRole("button", { name: "Cambiar idioma" }),
      ).toBeVisible();
      await expect(page.locator('a[href="/app/login"]')).toBeVisible();
    }
  });
}

test("Acerca de mantiene el contacto localizado", async ({ page }) => {
  await page.goto("/en/about");

  await expect(page.locator('.about-contact-btn[href="/en/support"]')).toBeVisible();
});

test("Soporte conserva canales, FAQ y accesibilidad", async ({ page }) => {
  await page.goto("/support");

  await expect(page.locator('.support-channel-action[href="/docs"]')).toBeVisible();
  await expect(page.locator('.support-channel-action[href^="mailto:"]')).toBeVisible();
  await expect(page.locator('.support-channel-action[href$="/issues"]')).toBeVisible();

  const firstQuestion = page.locator(".support-faq details").first();
  await firstQuestion.locator("summary").click();
  await expect(firstQuestion).toHaveAttribute("open", "");

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
});
