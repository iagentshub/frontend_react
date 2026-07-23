import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentBuilderDialog } from "./agent-builder-dialog";

const connections = [
  {
    id: "deepseek",
    name: "NVIDIA NIM PRO",
    type: "nvidia",
    model: "deepseek-ai/deepseek-v4-pro",
  },
  {
    id: "llama",
    name: "NVIDIA NIM RÁPIDO",
    type: "nvidia",
    model: "meta/llama-3.2-3b-instruct",
  },
];

afterEach(cleanup);

function renderBuilder() {
  return render(
    <AgentBuilderDialog
      connections={connections}
      skills={[]}
      knowledge={[]}
      onClose={vi.fn()}
      onSaved={vi.fn()}
    />,
  );
}

describe("AgentBuilderDialog", () => {
  it("ofrece caminos claros para usuarios guiados y técnicos", () => {
    renderBuilder();

    expect(
      screen.getByRole("button", { name: /Guiarme paso a paso/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ya tengo instrucciones/i }),
    ).toBeInTheDocument();
  });

  it("preselecciona Llama 3B para construir y conserva DeepSeek como agente final", () => {
    renderBuilder();

    const summary = screen.getByText("Configuración de modelos").closest("summary");
    expect(summary).toHaveTextContent("meta/llama-3.2-3b-instruct");
    expect(summary).toHaveTextContent("deepseek-ai/deepseek-v4-pro");
  });

  it("el modo guiado usa lenguaje sencillo y ejemplos seleccionables", async () => {
    renderBuilder();

    await userEvent.click(
      screen.getByRole("button", { name: /Guiarme paso a paso/i }),
    );

    expect(
      screen.getByText(/No necesitas usar términos técnicos/i),
    ).toBeInTheDocument();
    const example = screen.getByRole("button", {
      name: "Responder dudas de clientes",
    });
    await userEvent.click(example);
    expect(screen.getByRole("textbox")).toHaveValue(
      "Quiero un agente para responder dudas de clientes",
    );
  });

  it("el modo técnico invita a pegar la especificación completa", async () => {
    renderBuilder();

    await userEvent.click(
      screen.getByRole("button", { name: /Ya tengo instrucciones/i }),
    );

    expect(
      screen.getByPlaceholderText(/Pega aquí todas las instrucciones/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Responder dudas de clientes")).not.toBeInTheDocument();
  });
});
