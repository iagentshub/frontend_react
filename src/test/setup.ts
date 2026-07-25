import "@testing-library/jest-dom/vitest";
import { afterEach, beforeAll } from "vitest";

// Node 25+ exposes incomplete storage globals unless it is started with a
// persistence file. Keep unit tests browser-like and isolated in memory.
function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, String(value));
    },
  };
}

Object.defineProperty(globalThis, "localStorage", { configurable: true, value: createStorage() });
Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: createStorage() });

beforeAll(async () => {
  const { default: i18n } = await import("@/i18n");
  await i18n.changeLanguage("es");
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
