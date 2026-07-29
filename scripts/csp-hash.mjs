// Verifica que el hash CSP del bloque JSON-LD de index.html sigue declarado en
// nginx.react.conf. Sin él, el navegador bloquea los datos estructurados por
// `script-src 'self'` y Search Console deja de verlos.
//
//   node scripts/csp-hash.mjs           → falla si el hash no coincide
//   node scripts/csp-hash.mjs --print   → imprime el hash a copiar
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const html = await readFile("index.html", "utf8");
const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!match) {
  console.error("No hay bloque JSON-LD en index.html");
  process.exit(1);
}

// Git puede materializar CRLF en Windows aunque la imagen se construya en
// Linux con LF. Normalizar evita validar un hash distinto al de producción.
const normalizedJsonLd = match[1].replace(/\r\n/g, "\n");
const hash = `sha256-${createHash("sha256").update(normalizedJsonLd, "utf8").digest("base64")}`;

if (process.argv.includes("--print")) {
  console.log(hash);
  process.exit(0);
}

const conf = await readFile("nginx.react.conf", "utf8");
const declarations = conf.split("\n").filter((line) => line.includes("Content-Security-Policy"));
const missing = declarations.filter((line) => !line.includes(hash));

if (declarations.length === 0 || missing.length > 0) {
  console.error(
    `El hash del JSON-LD es ${hash} y falta en ${missing.length || "todas"} de las ` +
      `${declarations.length} directivas Content-Security-Policy de nginx.react.conf.\n` +
      "Añádelo a script-src en cada una y vuelve a ejecutar.",
  );
  process.exit(1);
}

console.log(`JSON-LD permitido por CSP (${hash})`);
