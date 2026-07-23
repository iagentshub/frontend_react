import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ga-theme", "dark-blue");
    localStorage.setItem("ga-lang", "es");
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Unauthorized" }),
    }),
  );
});

test("la página de soporte ofrece documentación, contacto e incidencias", async ({ page }) => {
  await page.goto("/support");

  await expect(page).toHaveURL(/\/support$/);
  await expect(page.getByRole("heading", { level: 1, name: "¿Cómo podemos ayudarte?" })).toBeVisible();
  await expect(page.locator(".support-channel-card")).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Consultar documentación/ })).toHaveAttribute("href", "/docs");
  await expect(page.getByRole("link", { name: /Escribir a soporte/ })).toHaveAttribute("href", /mailto:hola@iagentshub\.com/);
  await expect(page.getByRole("link", { name: /Abrir una incidencia/ })).toHaveAttribute("href", "https://github.com/iagentshub/iAgents/issues");

  await page.getByText("No puedo acceder a mi cuenta").click();
  await expect(page.getByText(/Utiliza «¿Olvidaste tu contraseña\?»/)).toBeVisible();
});
