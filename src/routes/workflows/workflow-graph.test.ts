import { describe, expect, it } from "vitest";
import {
  canConnectSequence,
  normalizeLoadedWorkflow,
  workflowRoots,
  workflowSinks,
} from "./workflow-graph";
import type { Workflow, WorkflowNode } from "./types";

const nodes: WorkflowNode[] = ["a", "b", "c", "d"].map((id) => ({
  id,
  agent_id: id,
  label: id,
}));

describe("workflow graph", () => {
  it("keeps legacy workflows compatible by creating a linear path", () => {
    const workflow: Workflow = {
      name: "legacy",
      description: "",
      definition: { nodes: nodes.slice(0, 3), edges: [] },
    };
    expect(normalizeLoadedWorkflow(workflow).definition.edges).toEqual([
      { source: "a", target: "b", type: "sequence" },
      { source: "b", target: "c", type: "sequence" },
    ]);
  });

  it("preserves branches and detects their single root and join", () => {
    const edges = [
      { source: "a", target: "b", type: "sequence" as const },
      { source: "a", target: "c", type: "sequence" as const },
      { source: "b", target: "d", type: "sequence" as const },
      { source: "c", target: "d", type: "sequence" as const },
    ];
    expect(workflowRoots(nodes, edges).map((node) => node.id)).toEqual(["a"]);
    expect(workflowSinks(nodes, edges).map((node) => node.id)).toEqual(["d"]);
    expect(
      normalizeLoadedWorkflow({
        name: "parallel",
        description: "",
        definition: { nodes, edges },
      }).definition.edges,
    ).toEqual(edges);
  });

  it("rejects duplicate and cyclic connections", () => {
    const edges = [
      { source: "a", target: "b", type: "sequence" as const },
      { source: "b", target: "c", type: "sequence" as const },
    ];
    expect(canConnectSequence(nodes, edges, "a", "b")).toBe(false);
    expect(canConnectSequence(nodes, edges, "c", "a")).toBe(false);
    expect(canConnectSequence(nodes, edges, "a", "c")).toBe(true);
  });
});
