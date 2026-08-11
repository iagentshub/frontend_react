/* global document */
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { publicRoutes } from "./public-routes.mjs";

const port = 4174;
const origin = `http://127.0.0.1:${port}`;
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
  const browser = await chromium.launch({ headless: true });
  // Locale fijo: el HTML servido declara lang="es", así que el contenido
  // congelado debe estar en español (i18n detecta el idioma del navegador).
  // reducedMotion: el HTML congelado debe recoger el estado final, no un
  // fotograma intermedio. Sin esto, el contador del hero se serializaba a
  // mitad de la cuenta y el HTML servido decia "5 proveedores" y "88 %".
  const context = await browser.newContext({ locale: "es-ES", reducedMotion: "reduce" });
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
  // Solo se congelan las diez URL declaradas en public-routes.mjs. Mantener la
  // lista fuera de este script evita que sitemap, router y prerender diverjan.
  for (const { path: route, language } of publicRoutes) {
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
