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
      body: JSON.stringify({ guest_enabled: true, registration: "open", billing_enabled: false, landing_enabled: true }),
    }),
  );
});

test("la landing y el login cargan sin errores de consola", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("401 (Unauthorized)")) {
      errors.push(message.text());
    }
  });
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Unauthorized" }) }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Toda tu IA en un solo lugar");
  await page.locator('a[href="/login/"]').first().click();
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark-blue");
  expect(errors).toEqual([]);
});

test("una ruta privada redirige al login conservando el destino", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Unauthorized" }) }),
  );
  await page.goto("/agents/?page=2");
  await expect(page).toHaveURL(/\/login\/\?redirect=%2Fagents%2F%3Fpage%3D2/);
});

test("el shell autenticado comparte la sesión y muestra navegación", async ({ page }) => {
  let sessionRequests = 0;
  await page.route("**/api/auth/me", (route) => {
    sessionRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ username: "admin@example.com", role: "admin" }),
    });
  });
  await page.route("**/api/settings", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ theme: "dark-blue", language: "es" }) }),
  );

  await page.goto("/dashboard/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  expect(sessionRequests).toBe(1);
});

test("el login no tiene infracciones graves de accesibilidad", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ detail: "Unauthorized" }) }),
  );
  await page.goto("/login/");
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === "critical" || violation.impact === "serious",
  );
  expect(serious).toEqual([]);
});

test("recuperación y verificación gestionan estados seguros", async ({ page }) => {
  await page.route("**/api/auth/verify?token=valid", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }),
  );
  await page.goto("/verify/?token=valid");
  await expect(page.getByRole("heading", { name: "¡Cuenta verificada!" })).toBeVisible();

  await page.goto("/reset-password/");
  await expect(page.getByRole("heading", { name: "Enlace inválido" })).toBeVisible();

  await page.goto("/forgot-password/");
  await expect(page.getByRole("heading", { name: "Recuperar contraseña" })).toBeVisible();
});

test("los enlaces públicos abren About y Documentación", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/");
  await page.locator('a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("¿Qué es iAgents Hub?");

  await page.goto("/");
  await page.locator('a[href="/docs"]').click();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Documentación");
});

test("el feed autenticado carga una vez y se cierra con Escape", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ username: "user@example.com", role: "user" }) }));
  await page.route("**/api/settings", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  let feedRequests = 0;
  await page.route("**/api/feed?limit=30", (route) => {
    feedRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ resource_type: "agent", resource_id: "a1", name: "Agente demo", owner: "alice", description: "Descripción", stars_count: 2 }]) });
  });
  await page.goto("/dashboard/");
  const hamburger = page.getByRole("button", { name: "Abrir menú" });
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await expect(page.locator(".main-nav")).toHaveClass(/nav-open/);
  }
  await page.getByRole("button", { name: "Feed" }).click();
  await expect(page.getByText("Agente demo")).toBeVisible();
  expect(feedRequests).toBe(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".feed-drawer")).not.toHaveClass(/open/);
});
