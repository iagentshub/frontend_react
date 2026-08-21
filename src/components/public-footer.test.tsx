import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { PublicFooter } from "./public-footer";

function renderFooter(billingEnabled = true) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <PublicFooter path="/" billingEnabled={billingEnabled} />
    </MemoryRouter>,
  );
}

afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("es");
});

describe("PublicFooter", () => {
  it("mantiene los grupos, licencia e idioma accesibles", () => {
    renderFooter();

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText(/licencia MIT/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /licencia MIT/ })).toHaveAttribute(
      "href",
      "https://github.com/iagentshub/frontend_react/blob/main/LICENSE",
    );
    expect(screen.getByRole("button", { name: "Cambiar idioma" })).toHaveTextContent("EN");
    expect(screen.getByRole("link", { name: "Precios" })).toHaveAttribute("href", "/pricing/");
  });

  it("oculta precios cuando la facturación está deshabilitada", () => {
    renderFooter(false);

    const product = screen.getByRole("navigation", { name: "Producto" });
    expect(within(product).queryByRole("link", { name: "Precios" })).not.toBeInTheDocument();
  });

  it("genera los enlaces y etiquetas en inglés", async () => {
    await i18n.changeLanguage("en");
    renderFooter();

    expect(screen.getByRole("navigation", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/en/docs");
    expect(screen.getByRole("button", { name: "Change language" })).toHaveTextContent("ES");
  });
});
