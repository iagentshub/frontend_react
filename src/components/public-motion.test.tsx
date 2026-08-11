import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentNetwork } from "./agent-network";
import { PublicMotionProvider, PublicShell, Reveal, Stagger } from "./public-motion";

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    }),
  });
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, "IntersectionObserver");
});

describe("public motion primitives", () => {
  it("mantiene el contenido visible sin IntersectionObserver", () => {
    setReducedMotion(false);
    render(
      <PublicMotionProvider>
        <Reveal>Contenido renderizado</Reveal>
      </PublicMotionProvider>,
    );

    expect(screen.getByText("Contenido renderizado")).toBeVisible();
  });

  it("deja de observar el contenido al desmontarse", async () => {
    setReducedMotion(false);
    const observe = vi.fn();
    const unobserve = vi.fn();
    class ObserverMock {
      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
      takeRecords = () => [];
      root = null;
      rootMargin = "0px";
      thresholds = [0];
    }
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      value: ObserverMock,
    });

    const view = render(
      <PublicMotionProvider>
        <Reveal>Observado</Reveal>
      </PublicMotionProvider>,
    );
    await waitFor(() => expect(observe).toHaveBeenCalled());
    view.unmount();
    await waitFor(() => expect(unobserve).toHaveBeenCalled());
  });

  it("renderiza el shell y el stagger sin alterar el contenido semántico", () => {
    setReducedMotion(true);
    render(
      <PublicMotionProvider>
        <PublicShell intensity="quiet">
          <Stagger>
            <article>Uno</article>
            <article>Dos</article>
          </Stagger>
        </PublicShell>
      </PublicMotionProvider>,
    );

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByText("Uno").closest(".public-shell--quiet")).not.toBeNull();
  });

  it("mantiene la red fuera del árbol accesible y con nodos deterministas", () => {
    setReducedMotion(true);
    const { container } = render(
      <PublicMotionProvider>
        <AgentNetwork />
      </PublicMotionProvider>,
    );

    expect(container.querySelector(".agent-network")).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelectorAll(".agent-network-node")).toHaveLength(6);
    expect(container.querySelector("svg")).toHaveAttribute("focusable", "false");
  });
});
