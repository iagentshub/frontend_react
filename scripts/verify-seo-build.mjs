import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { publicRoutes } from "./public-routes.mjs";

const site = "https://www.iagentshub.com";

function htmlTarget(route) {
  if (route === "/") return path.join("dist", "index.html");
  if (route.endsWith("/"))
    return path.join("dist", route.replace(/^\//, "").replace(/\/$/, ""), "index.html");
  return path.join("dist", `${route.replace(/^\//, "")}.html`);
}

function count(html, pattern) {
  return [...html.matchAll(pattern)].length;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const route of publicRoutes) {
  const file = htmlTarget(route.path);
  const html = await readFile(file, "utf8");
  const canonical = `${site}${route.path}`;

  assert(count(html, /<title(?:\s[^>]*)?>/g) === 1, `${file}: debe contener un solo title`);
  assert(
    count(html, /<meta\s+name="description"/g) === 1,
    `${file}: debe contener una sola description`,
  );
  assert(count(html, /<h1(?:\s[^>]*)?>/g) === 1, `${file}: debe contener un solo h1`);
  assert(
    html.includes(`<link rel="canonical" href="${canonical}"`),
    `${file}: canonical incorrecto`,
  );
  assert(
    html.includes(`hreflang="es" href="${site}${route.alternates.es}"`) &&
      html.includes(`hreflang="en" href="${site}${route.alternates.en}"`) &&
      html.includes(`hreflang="x-default" href="${site}${route.alternates.es}"`),
    `${file}: hreflang incompleto o no recíproco`,
  );
  assert(
    html.includes(`<html lang="${route.language}"`),
    `${file}: el idioma del documento no coincide con la URL`,
  );
  assert(!html.includes("127.0.0.1:4174"), `${file}: contiene referencias al preview local`);
}

const index = await readFile("dist/index.html", "utf8");
const schemas = [...index.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
assert(schemas.length === 1, "index.html: debe contener un único bloque JSON-LD global");
const graph = JSON.parse(schemas[0][1]);
const types = new Set(graph["@graph"]?.map((node) => node["@type"]));
for (const type of ["Organization", "WebSite", "SoftwareApplication"])
  assert(types.has(type), `index.html: falta el schema ${type}`);

const sitemap = await readFile("public/sitemap.xml", "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const expectedUrls = publicRoutes.map((route) => `${site}${route.path}`);
assert(
  JSON.stringify(sitemapUrls) === JSON.stringify(expectedUrls),
  "sitemap.xml: las URL no coinciden con el manifiesto público",
);
assert(!/\/(?:login|dashboard|admin|api)\b/.test(sitemap), "sitemap.xml: contiene rutas privadas");
await stat("dist/404.html");

console.log(`SEO verificado en ${publicRoutes.length} páginas y 404.html`);
