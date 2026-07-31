import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/en/",
  "/about",
  "/en/about",
  "/pricing/",
  "/en/pricing/",
  "/docs",
  "/en/docs",
  "/support",
  "/en/support",
] as const;

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.route("**/api/settings/platform/public", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ landing_enabled: true, billing_enabled: true }),
    }),
  );
});

for (const path of publicRoutes) {
  test(`${path} sigue siendo una ruta pública React`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "index, follow, max-image-preview:large, max-snippet:-1",
    );
  });
}
