import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { PricingPage } from "./pricing-page";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/pricing/"]}>
        <PricingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PricingPage", () => {
  afterEach(async () => {
    cleanup();
    await i18n.changeLanguage("es");
  });

  it("abre el modal de calculadora al pulsar el botón y lo cierra con el botón de cerrar", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: /calcular tu mejor plan y presupuesto/i }));

    const dialog = screen.getByRole("dialog", { name: /calcula tu mejor plan/i });
    expect(dialog).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cerrar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traduce el botón de cerrar del modal en vez de usar el literal fijo 'Cerrar'", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /calculate your best plan and budget/i }));

    const dialog = screen.getByRole("dialog", { name: /calculate your best plan/i });
    // Regresión: el aria-label venía hardcodeado en español ("Cerrar") sin
    // pasar por i18n. En inglés debe leerse "Close".
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Cerrar" })).toBeNull();
  });

  it("selecciona el plan Legión y abre el formulario de contacto sin navegar", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /calcular tu mejor plan y presupuesto/i }));
    await user.click(screen.getByRole("button", { name: "Legión" }));
    await user.click(screen.getByRole("button", { name: /^Contratar Legión$/ }));

    const contactDialog = screen.getByRole("dialog");
    expect(within(contactDialog).getByText("Solicitar Plan Legión")).toBeInTheDocument();
    expect(within(contactDialog).getByLabelText("Nombre")).toBeInTheDocument();
    expect(within(contactDialog).getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });
});
