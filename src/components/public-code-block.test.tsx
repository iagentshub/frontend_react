import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicCodeBlock } from "./public-code-block";

const props = {
  command: "curl https://example.test/install.sh | bash",
  label: "Linux / macOS",
  copyLabel: "Copiar",
  copiedLabel: "¡Copiado!",
  copyFailedLabel: "No se pudo copiar",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
});

describe("PublicCodeBlock", () => {
  it("copia el comando y anuncia el resultado", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<PublicCodeBlock {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(writeText).toHaveBeenCalledWith(props.command);
    expect(screen.getByRole("button", { name: "¡Copiado!" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("¡Copiado!");
  });

  it("usa el fallback cuando Clipboard API no está disponible", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { configurable: true, value: execCommand });
    render(<PublicCodeBlock {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: "¡Copiado!" })).toBeInTheDocument();
  });

  it("mantiene el comando disponible si no puede copiarlo", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => false),
    });
    render(<PublicCodeBlock {...props} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(screen.getByRole("button", { name: "No se pudo copiar" })).toBeInTheDocument();
    expect(screen.getByText(props.command)).toHaveAttribute("tabindex", "0");
  });
});
