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
    "Tu equipo y sus agentes, en el mismo espacio",
  );
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Un grupo de trabajo es mucho más que una carpeta compartida",
    }),
  ).toBeVisible();
  await expect(page.locator('a[href="/app/login"]').first()).toHaveAttribute("href", "/app/login");
  await expect(page.locator('a[href="/app/register"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("los enlaces públicos abren About y Documentación", async ({ page }) => {
  // La landing se prerenderiza entera, pero al hidratar devuelve null mientras
  // la consulta de plataforma está pendiente y rehace el DOM. Sin esperar a que
  // esa petición termine, el clic apunta a un nodo ya reemplazado.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('.public-footer a[href="/about"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "La IA de tu organización, trabajando en grupo",
  );

  // El footer es visible también cuando la navegación principal se compacta.
  await page.goto("/", { waitUntil: "networkidle" });
  await page.locator('.public-footer a[href="/docs"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Documentación");
});

test("la documentación abre grupos desde el enlace contextual", async ({ page }) => {
  await page.goto("/docs#teams");
  const groups = page.locator("#teams details");
  await expect(groups).toHaveAttribute("open", "");
  await expect(groups).toContainText("orquestaciones LLM");
});
