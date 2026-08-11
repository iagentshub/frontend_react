import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "./public-header";

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PublicHeader variant="about" label="Sobre nosotros" path="/about" />
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

  it("muestra la etiqueta recibida", () => {
    const { container } = renderHeader();
    expect(container.querySelector(".about-header-label")).toHaveTextContent("Sobre nosotros");
  });

  it("no duplica la flecha del enlace a Dashboard", () => {
    // La traducción ya trae "← Dashboard"; añadir otra flecha en el componente
    // daba "← ← Dashboard".
    const { container } = renderHeader();
    const accion = container.querySelector(".about-header-action");
    expect(accion?.textContent ?? "").not.toMatch(/←\s*←/);
  });
});
