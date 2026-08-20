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
    expect(layout.codeBlocks).toHaveLength(2);
    expect(layout.codeBlocks.every(({ client, scroll }) => scroll >= client)).toBe(true);
  }
});

test("la instalación permite elegir Linux, macOS y Windows", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const platforms = page.getByRole("group", { name: "Elige tu plataforma" });
  const linux = platforms.getByRole("button", { name: "Linux" });
  const macos = platforms.getByRole("button", { name: "macOS" });
  const windows = platforms.getByRole("button", { name: "Windows" });
  const command = page.locator("#landing-install-command code");

  await expect(linux).toHaveAttribute("aria-pressed", "true");
  await expect(linux.locator("svg")).toBeVisible();
  await expect(macos.locator("svg")).toBeVisible();
  await expect(windows.locator("svg")).toBeVisible();
  await expect(command).toContainText("install.sh");

  await windows.click();
  await expect(windows).toHaveAttribute("aria-pressed", "true");
  await expect(command).toContainText("install.ps1");

  await macos.focus();
  await page.keyboard.press("Enter");
  await expect(macos).toHaveAttribute("aria-pressed", "true");
  await expect(command).toContainText("install.sh");
});

test("la rejilla de capacidades lista las seis funcionalidades", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const cards = page.locator(".landing-feature-card");
  await expect(cards).toHaveCount(6);
  // Los visuales decorativos se retiraron: eran seis dibujos abstractos que
  // había que descifrar antes de leer el título. La tarjeta es icono, título
  // y texto, y nada más.
  await expect(page.locator(".landing-feature-visual")).toHaveCount(0);

  for (const feature of [
    "groups",
    "multi_agent",
    "providers",
    "knowledge",
    "selfhosted",
    "export",
  ]) {
    const card = page.locator(`.landing-feature-card[data-feature="${feature}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator(".landing-feature-icon svg")).toBeVisible();
    await expect(card.locator("h3")).not.toBeEmpty();
  }
});

test("la cinta de proveedores enseña los siete y no se apoya en el movimiento", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // El riel va duplicado para que el bucle no salte, así que el nombre
  // accesible es una lista aparte: un lector de pantalla no debe oír catorce.
  await expect(page.locator(".landing-providers .sr-only")).toHaveText(
    "Claude, OpenAI, Gemini, Grok, Qwen, NVIDIA, Ollama",
  );
  await expect(page.locator(".landing-providers-run")).toHaveCount(2);
  await expect(page.locator(".landing-providers-run").first().locator(".landing-provider")).toHaveCount(
    7,
  );
});

test("acerca de representa visualmente sus funcionalidades", async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.goto("/about", { waitUntil: "networkidle" });

    await expect(page.locator(".about-feature")).toHaveCount(9);
    await expect(page.locator(".about-feature-visual")).toHaveCount(9);

    const layout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      page: document.documentElement.scrollWidth,
    }));
    expect(layout.page, `overflow horizontal en Acerca de a ${width}px`).toBe(layout.viewport);
  }

  for (const feature of [
    "groups",
    "multi_agent",
    "providers",
    "selfhosted",
    "knowledge",
    "skills",
    "dashboard",
    "centinel",
    "export",
  ]) {
    const card = page.locator(`.about-feature[data-feature="${feature}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator(".about-feature-visual")).toHaveAttribute("aria-hidden", "true");
  }
});
