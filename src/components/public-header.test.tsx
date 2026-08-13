import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "./public-header";

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/about"]}>
        <PublicHeader variant="about" path="/about" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PublicHeader", () => {
  it("usa el prefijo de clase de la página para no cambiar sus estilos", () => {
    const { container } = renderHeader();
    expect(container.querySelector("header")).toHaveClass("about-header");
    expect(container.querySelector(".about-logo")).not.toBeNull();
    expect(container.querySelector(".about-header-action")).not.toBeNull();
  });

  it("no repite junto al logo la pagina que ya marca la navegacion", () => {
    const { container } = renderHeader();
    expect(container.querySelector(".about-header-label")).toBeNull();
    expect(container.querySelector(".about-header-divider")).toBeNull();
  });

  it("mantiene todos los destinos publicos en la cabecera", () => {
    const { container } = renderHeader();
    const navigation = within(container).getByRole("navigation");
    const destinations = within(navigation)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));

    expect(destinations).toEqual([
      "/",
      "/about",
      "/docs",
      "/pricing/",
      "/support",
      "https://github.com/iagentshub/iAgents",
    ]);
  });

  it("no duplica la flecha del enlace a Dashboard", () => {
    // La traducción ya trae "← Dashboard"; añadir otra flecha en el componente
    // daba "← ← Dashboard".
    const { container } = renderHeader();
    const accion = container.querySelector(".about-header-action");
    expect(accion?.textContent ?? "").not.toMatch(/←\s*←/);
  });
});
