import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { publicPagePairs } from "./public-routes.mjs";

const run = promisify(execFile);
const site = "https://www.iagentshub.com";

// En el build Docker no existe .git. Conservamos entonces los lastmod que el
// workflow generó antes de crear el contexto, en vez de sustituirlos por hoy.
const previous = await readFile("public/sitemap.xml", "utf8").catch(() => "");
const previousLastmod = new Map();
for (const block of previous.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
  const loc = block[1].match(/<loc>(.*?)<\/loc>/)?.[1];
  const lastmod = block[1].match(/<lastmod>(.*?)<\/lastmod>/)?.[1];
  if (loc && lastmod) previousLastmod.set(loc, lastmod);
}

function escapeXml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/**
 * Google pide que lastmod represente cambios reales. Usamos la fecha del último
 * commit que tocó el contenido de cada idioma; si Git no está disponible (por
 * ejemplo dentro de una imagen mínima), omitimos la etiqueta antes que mentir.
 */
async function lastModified(sources) {
  try {
    const { stdout } = await run("git", ["log", "-1", "--format=%cI", "--", ...sources]);
    const value = stdout.trim();
    return value || null;
  } catch {
    return null;
  }
}

const entries = await Promise.all(
  publicPagePairs.flatMap((pair) =>
    ["es", "en"].map(async (language) => ({
      loc: pair[language],
      es: pair.es,
      en: pair.en,
      lastmod:
        (await lastModified(pair.sources[language])) ??
        previousLastmod.get(`${site}${pair[language]}`) ??
        null,
    })),
  ),
);

const urls = entries
  .map(({ loc, es, en, lastmod }) =>
    [
      "  <url>",
      `    <loc>${site}${escapeXml(loc)}</loc>`,
      ...(lastmod ? [`    <lastmod>${escapeXml(lastmod)}</lastmod>`] : []),
      `    <xhtml:link rel="alternate" hreflang="es" href="${site}${escapeXml(es)}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${site}${escapeXml(en)}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${site}${escapeXml(es)}" />`,
      "  </url>",
    ].join("\n"),
  )
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${urls}
</urlset>
`;

await writeFile("public/sitemap.xml", xml, "utf8");
console.log(`sitemap.xml generado con ${entries.length} URL públicas`);
