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
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
});

test("la landing carga y enlaza con Flutter bajo /app", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) {
      errors.push(message.text());
    }
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Toda tu IA en un solo lugar",
  );
  await expect(page.locator('a[href="/app/login"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("los enlaces públicos abren About y Documentación", async ({ page }) => {
  await page.goto("/");
  await page.locator('a[href="/about"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("¿Qué es iAgents Hub?");

  await page.goto("/");
  await page.getByRole("link", { name: "Documentación", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Documentación");
});
