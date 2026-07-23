import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("ga-theme", "dark-blue");
    localStorage.setItem("ga-lang", "es");
  });
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const responses: Record<string, unknown> = {
      "/api/auth/me": { username: "admin@example.com", role: "admin" },
      "/api/settings": { theme: "dark-blue", language: "es" },
      "/api/settings/platform": { stress_max_concurrency: 250 },
      "/api/admin/centinel/tree": {
        dirs: [{ dir: "tests", count: 1, files: [{ file: "tests/test_demo.py", count: 1, tests: ["test_demo"] }] }],
      },
      "/api/admin/centinel/status": { status: "idle" },
      "/api/admin/centinel/history": [],
      "/api/admin/centinel/stress/status": {
        status: "done",
        ticks: [{ tick: 1, count: 20, errors: 0, avg_s: 0.12, p95_s: 0.2, min_s: 0.08, max_s: 0.22, rps: 42, active_users: 10 }],
        result: { total: 20, errors: 0, avg_s: 0.12, avg_per_user_s: 0.13, p50_s: 0.11, p90_s: 0.18, p95_s: 0.2, p99_s: 0.22, rps: 42 },
        errors: [],
      },
      "/api/admin/centinel/stress/probe": {
        status: "done",
        ticks: [{ users: 10, rps: 40, errors: 0, avg_s: 0.1 }],
        steps: [{ users: 10, effective_users: 10, total: 100, errors: 0, error_rate: 0, rps: 40, avg_s: 0.1, elapsed_s: 10, status: "ok" }],
        verdict: { stable_users: 10, break_users: 60, error_rate: 0.02, break_rps: 38 },
      },
    };
    if (path in responses) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(responses[path]) });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
});

test("Centinel expone las tres herramientas y sus métricas reales", async ({ page }) => {
  await page.goto("/admin/centinel/");

  const tabs = page.getByRole("tab");
  await expect(tabs).toHaveCount(3);
  await expect(page.getByRole("tab", { name: /Funcionalidad/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("tests/test_demo.py", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /Rendimiento/ }).click();
  await expect(page.getByText("Peticiones totales")).toBeVisible();
  await expect(page.getByText("0.120 s")).toBeVisible();
  await expect(page.getByRole("img", { name: "Tiempo de respuesta en tiempo real" })).toBeVisible();

  await page.getByRole("tab", { name: /Buscar límite/ }).click();
  await expect(page.getByText("Pasos ejecutados")).toBeVisible();
  await expect(page.getByText("Punto de quiebre:")).toBeVisible();
  await expect(page.getByText("60", { exact: true })).toBeVisible();
  await expect(page.locator(".form-error")).toHaveCount(0);
});
