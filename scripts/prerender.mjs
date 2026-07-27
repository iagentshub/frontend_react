/* global document */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const port = 4174;
const origin = `http://127.0.0.1:${port}`;
// Rutas públicas indexables: cada una se congela con su <title>, description,
// canonical y Open Graph ya resueltos, para que los buscadores no dependan de
// ejecutar el bundle.
const routes = [
  { path: "/", language: "es" },
  { path: "/about", language: "es" },
  { path: "/pricing/", language: "es" },
  { path: "/docs", language: "es" },
  { path: "/support", language: "es" },
  { path: "/en/", language: "en" },
  { path: "/en/about", language: "en" },
  { path: "/en/pricing/", language: "en" },
  { path: "/en/docs", language: "en" },
  { path: "/en/support", language: "en" },
];
// Se lanza el binario de vite con el propio node en vez de `npm run preview`:
// spawn de un .cmd falla en Windows con Node ≥ 22 (EINVAL) y, con shell, el
// kill del final mataría al shell dejando vivo el servidor.
const viteBin = path.join("node_modules", "vite", "bin", "vite.js");
const preview = spawn(
  process.execPath,
  [viteBin, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: "inherit" },
);

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {
      /* preview still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Vite preview no arrancó a tiempo");
}

function targetFor(route) {
  if (route === "/") return path.join("dist", "index.html");
  if (route.endsWith("/"))
    return path.join("dist", route.replace(/^\//, "").replace(/\/$/, ""), "index.html");
  return path.join("dist", `${route.replace(/^\//, "")}.html`);
}

async function freeze(page, target) {
  // Los <link> de precarga que React inyecta en runtime quedan serializados
  // con href absoluto al servidor de preview: se vuelven relativos o el HTML
  // desplegado pediría los chunks a 127.0.0.1.
  const html = (await page.content()).replaceAll(origin, "");
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

try {
  await waitForServer();
  // Copia intacta del shell antes de congelar nada: es el fallback de nginx
  // para las rutas no prerenderizadas. Si se usara index.html (ya congelado con
  // la landing), /dashboard/ o /login/ pintarían la landing hasta que React
  // monta, porque el cliente renderiza de cero en vez de hidratar.
  await copyFile(path.join("dist", "index.html"), path.join("dist", "app.html"));

  const browser = await chromium.launch({ headless: true });
  // Locale fijo: el HTML servido declara lang="es", así que el contenido
  // congelado debe estar en español (i18n detecta el idioma del navegador).
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();
  await page.route("**/api/settings/platform/public", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ landing_enabled: true, billing_enabled: true, registration: "open" }),
    }),
  );
  // Sin backend, el preview responde el index.html a /api/* y react-query
  // reintenta hasta que la red nunca queda inactiva: se responde 401 directo.
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Unauthorized" }),
    }),
  );
  for (const { path: route, language } of routes) {
    await page.goto(`${origin}${route}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForFunction(
      ({ expectedLanguage, expectedCanonical }) =>
        document.documentElement.lang === expectedLanguage &&
        document.querySelector('link[rel="canonical"]')?.getAttribute("href") ===
          expectedCanonical &&
        document.querySelectorAll('meta[name="description"]').length === 1 &&
        document.querySelectorAll("title").length === 1,
      {
        expectedLanguage: language,
        expectedCanonical: `https://www.iagentshub.com${route}`,
      },
    );
    await freeze(page, targetFor(route));
  }

  // Una URL desconocida debe responder con estado HTTP 404, no con el shell y
  // un 200. Se congela la misma pantalla de React para mantener el diseño y las
  // traducciones, mientras nginx se encarga del estado real.
  await page.goto(`${origin}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.goto(`${origin}/__not_found__`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () =>
      document.querySelector('meta[name="robots"]')?.getAttribute("content") ===
        "noindex, nofollow" && document.querySelector("h1")?.textContent === "404",
  );
  await freeze(page, path.join("dist", "404.html"));

  await browser.close();
} finally {
  preview.kill();
}
