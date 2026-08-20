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
  // El hero repite «Consultar documentación» y «Escribir a soporte» para
  // adelantar la primera acción, así que las dos primeras comprobaciones se
  // acotan a las tarjetas, que es lo que este test vigila.
  const canales = page.locator(".support-channel-grid");
  await expect(canales.getByRole("link", { name: /Consultar documentación/ })).toHaveAttribute("href", "/docs");
  await expect(canales.getByRole("link", { name: /Escribir a soporte/ })).toHaveAttribute("href", /mailto:hola@iagentshub\.com/);
  await expect(page.getByRole("link", { name: /Abrir una incidencia/ })).toHaveAttribute("href", "https://github.com/iagentshub/iAgents/issues");

  // Y el hero las ofrece antes de que haya que bajar a buscarlas.
  await expect(page.locator(".support-hero-actions a")).toHaveCount(2);

  await page.getByText("No puedo acceder a mi cuenta").click();
  await expect(page.getByText(/Utiliza «¿Olvidaste tu contraseña\?»/)).toBeVisible();
});
