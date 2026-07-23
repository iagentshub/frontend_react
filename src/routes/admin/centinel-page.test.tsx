import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CentinelPage } from "./centinel-page";

const get = vi.fn<(url: string) => Promise<unknown>>();

vi.mock("@/api/client", () => ({
  ApiError: class ApiError extends Error {},
  api: {
    get: (url: string) => get(url),
    post: vi.fn(),
    delete: vi.fn(),
  },
  streamEvents: async function* () {
    await Promise.resolve();
    if (Date.now() < 0) yield { data: {} };
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CentinelPage />
    </QueryClientProvider>,
  );
}

describe("CentinelPage", () => {
  afterEach(cleanup);

  beforeEach(() => {
    get.mockImplementation((url: string) => {
      if (url.endsWith("/tree")) return Promise.resolve({ dirs: [] });
      if (url.endsWith("/history")) return Promise.resolve([]);
      if (url.endsWith("/stress/status")) {
        return Promise.resolve({
          status: "done",
          ticks: [{ tick: 1, count: 4, errors: 0, avg_s: 0.12, p95_s: 0.2, min_s: 0.1, max_s: 0.2, rps: 4, active_users: 2 }],
          errors: [],
          result: { total: 4, errors: 0, avg_s: 0.12, avg_per_user_s: 0.13, rps: 4 },
        });
      }
      if (url.endsWith("/stress/probe")) return Promise.resolve({ status: "idle", steps: [], ticks: [] });
      if (url.endsWith("/settings/platform")) return Promise.resolve({ stress_max_concurrency: 0 });
      return Promise.resolve({ status: "idle", summary: {}, failed_ids: [] });
    });
  });

  it("muestra las tres secciones de producción", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: /Funcionalidad/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Rendimiento/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /Buscar límite/ })).toBeVisible();
  });

  it("consume las métricas en segundos y permite abrir Probe", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Rendimiento/ }));
    expect(await screen.findByText("0.120 s")).toBeVisible();
    expect(screen.getByText("Tiempo de respuesta en tiempo real")).toBeVisible();

    fireEvent.click(screen.getByRole("tab", { name: /Buscar límite/ }));
    expect(await screen.findByText("Pasos ejecutados")).toBeVisible();
    expect(screen.getByRole("button", { name: /Buscar límite/ })).toBeVisible();
  });
});
