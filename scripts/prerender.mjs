import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const port = 4174;
const origin = `http://127.0.0.1:${port}`;
const routes = ["/", "/about", "/pricing/", "/docs"];
const preview = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "preview", "--", "--port", String(port)], { stdio: "inherit" });

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(origin)).ok) return; } catch { /* preview still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Vite preview no arrancó a tiempo");
}

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.route("**/api/settings/platform/public", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ landing_enabled: true, billing_enabled: true, registration: "open" }) }));
  for (const route of routes) {
    await page.goto(`${origin}${route}`, { waitUntil: "networkidle" });
    const html = await page.content();
    const target = route === "/" ? path.join("dist", "index.html") : path.join("dist", route.replace(/^\//, "").replace(/\/$/, ""), "index.html");
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html, "utf8");
  }
  await browser.close();
} finally {
  preview.kill();
}
