import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowRunner } from "./workflow-runner";

vi.mock("@/api/client", () => ({
  streamEvents: async function* () {
    await Promise.resolve();
    yield { data: { type: "stage_started", node_id: "frontend" } };
    yield { data: { type: "stage_started", node_id: "backend" } };
    yield {
      data: {
        type: "stage_done",
        node_id: "frontend",
        agent_name: "Frontend",
        output: "frontend-ok",
      },
    };
    yield {
      data: {
        type: "stage_done",
        node_id: "backend",
        agent_name: "Backend",
        output: "backend-ok",
      },
    };
    yield { data: { type: "workflow_done", output: "join-ok" } };
  },
}));

afterEach(cleanup);

describe("WorkflowRunner", () => {
  it("mantiene visibles todas las ramas que trabajan en paralelo", async () => {
    const onProgress = vi.fn();
    render(<WorkflowRunner workflowId="parallel" onProgress={onProgress} />);

    await userEvent.type(screen.getByRole("textbox"), "Ejecutar prueba");
    await userEvent.click(screen.getByRole("button", { name: /Ejecutar orquestación/i }));

    await waitFor(() => {
      expect(onProgress).toHaveBeenCalledWith({
        running: true,
        stages: {
          frontend: "running",
          backend: "running",
        },
        evaluations: {},
      });
    });
    expect(await screen.findByText("Resultado final")).toBeVisible();
    expect(screen.getByText("join-ok")).toBeVisible();
  });
});
