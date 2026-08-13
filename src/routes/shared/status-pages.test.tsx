import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { NotFoundPage, RouteErrorBoundary, RouteLoading } from "./status-pages";

afterEach(cleanup);

describe("public route states", () => {
  it("presenta la carga dentro del canvas público", () => {
    const { container } = render(<RouteLoading />);

    expect(container.querySelector(".public-status-shell")).not.toBeNull();
    expect(screen.getByText("Cargando…")).toHaveAttribute("aria-live", "polite");
  });

  it("mantiene 404, navegación y noindex", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/no-existe"]}>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "404" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute("href", "/");
    expect(container.querySelector(".public-status-shell")).not.toBeNull();
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
  });

  it("conserva el mensaje y la acción del error de ruta", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          loader: () => {
            throw new Error("fallo controlado");
          },
          element: <div />,
          errorElement: <RouteErrorBoundary />,
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("fallo controlado");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });
});
