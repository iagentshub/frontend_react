import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const expectedRouteAreas = ["public", "shared"];
const expectedLocales = ["about.json", "common.json", "docs.json", "landing.json", "legal.json", "pricing.json", "seo.json", "support.json"];
const forbiddenDependencies = [
  "@dnd-kit/core",
  "@dnd-kit/sortable",
  "@hookform/resolvers",
  "@xyflow/react",
  "react-hook-form",
  "thinking-orbs",
  "zod",
];

function assertSame(actual, expected, label) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw new Error(`${label}: esperado ${right.join(", ")}; encontrado ${left.join(", ")}`);
  }
}

async function directories(relativePath) {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  const populated = [];
  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    if ((await readdir(path.join(root, relativePath, entry.name))).length > 0) populated.push(entry.name);
  }
  return populated;
}

async function files(relativePath) {
  const entries = await readdir(path.join(root, relativePath), { withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
}

assertSame(await directories("src/routes"), expectedRouteAreas, "Áreas React permitidas");
assertSame(await files("assets/locales/es"), expectedLocales, "Traducciones ES permitidas");
assertSame(await files("assets/locales/en"), expectedLocales, "Traducciones EN permitidas");

const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
for (const dependency of forbiddenDependencies) {
  if (packageJson.dependencies?.[dependency] || packageJson.devDependencies?.[dependency]) {
    throw new Error(`Dependencia privada no permitida: ${dependency}`);
  }
}

for (const removedPath of [
  "src/auth",
  "src/layout",
  "src/theme",
  "src/routes/public/checkout-page.tsx",
  "src/routes/public/public-profile-page.tsx",
]) {
  try {
    const removedStat = await stat(path.join(root, removedPath));
    if (removedStat.isDirectory() && (await readdir(path.join(root, removedPath))).length === 0) {
      continue;
    }
    throw new Error(`Código privado no permitido: ${removedPath}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.log("Arquitectura React public-only verificada");
