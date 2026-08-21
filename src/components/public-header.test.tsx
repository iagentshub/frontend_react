import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { PublicHeader } from "./public-header";

function renderHeader({
  variant = "about",
  path = "/about",
  billingEnabled = true,
}: {
  variant?: ComponentProps<typeof PublicHeader>["variant"];
  path?: ComponentProps<typeof PublicHeader>["path"];
  billingEnabled?: boolean;
} = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <PublicHeader variant={variant} path={path} billingEnabled={billingEnabled} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("es");
});

describe("PublicHeader", () => {
  it("usa el prefijo de clase de la página para no cambiar sus estilos", () => {
    const { container } = renderHeader();
    expect(container.querySelector("header")).toHaveClass("about-header");
    expect(container.querySelector(".about-logo")).not.toBeNull();
    expect(container.querySelector(".public-header-login")).not.toBeNull();
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

  it("conserva las acciones específicas de landing y pricing", () => {
    const landing = renderHeader({ variant: "landing", path: "/" });
    expect(landing.container.querySelector(".landing-header")).not.toBeNull();
    expect(landing.container.querySelector('[href="/app/login"]')).toHaveClass(
      "public-header-login",
    );
    expect(landing.container.querySelector('[href="/app/register"]')).not.toBeNull();
    landing.unmount();

    const pricing = renderHeader({ variant: "pr", path: "/pricing/" });
    expect(pricing.container.querySelector(".pr-header")).not.toBeNull();
    expect(pricing.container.querySelector('[href="/app/login"]')).toHaveClass(
      "public-header-login",
    );
    expect(pricing.container.querySelector(".pr-header-cta")).not.toBeNull();
  });

  it("respeta billing_enabled sin perder el estado activo", () => {
    const { container } = renderHeader({ billingEnabled: false });
    const navigation = within(container).getByRole("navigation");

    expect(within(navigation).queryByRole("link", { name: "Precios" })).not.toBeInTheDocument();
    expect(within(navigation).getByRole("link", { name: "Acerca de" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("cambia de idioma desde una pagina interior", async () => {
    renderHeader();

    const languageButton = screen.getByRole("button", { name: "Cambiar idioma" });
    expect(languageButton).toHaveTextContent("EN");
    await userEvent.click(languageButton);

    expect(await screen.findByRole("button", { name: "Change language" })).toHaveTextContent("ES");
  });
});
