import { expect, test } from "@playwright/test";

const privateRoutes = [
  "/dashboard/",
  "/agents/",
  "/connections/",
  "/memory/",
  "/knowledge/",
  "/explore/",
  "/labels/",
  "/manager/",
  "/profile/",
  "/admin/",
  "/admin/metadata/",
  "/admin/centinel/",
] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ga-theme", "dark-blue");
    localStorage.setItem("ga-lang", "es");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ username: "admin@example.com", role: "admin" }),
      });
    }
    if (path === "/api/settings") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Mocked unavailable state" }),
    });
  });
});

for (const path of privateRoutes) {
  test(`${path} conserva la ruta React y muestra el shell`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
    await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
    await expect(page.locator(".route-error")).toHaveCount(0);
    await expect(page.locator("main")).toBeVisible();
  });
}
