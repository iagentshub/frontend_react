import { describe, expect, it } from "vitest";
import {
  analyzeWorkflowGraph,
  canConnectSequence,
  hasSequencePath,
  normalizeLoadedWorkflow,
  prepareWorkflowForSave,
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
    expect(analyzeWorkflowGraph(nodes, edges)).toMatchObject({
      valid: true,
      branchCount: 1,
      joinCount: 1,
      topologicalOrder: ["a", "b", "c", "d"],
    });
  });

  it("does not recreate default connections while the graph is being edited", () => {
    const workflow: Workflow = {
      name: "editing",
      description: "",
      definition: { nodes: nodes.slice(0, 3), edges: [] },
    };

    expect(prepareWorkflowForSave(workflow).definition.edges).toEqual([]);
  });

  it("rejects duplicate and cyclic connections", () => {
    const edges = [
      { source: "a", target: "b", type: "sequence" as const },
      { source: "b", target: "c", type: "sequence" as const },
    ];
    expect(canConnectSequence(nodes, edges, "a", "b")).toBe(false);
    expect(canConnectSequence(nodes, edges, "c", "a")).toBe(false);
    expect(canConnectSequence(nodes, edges, "a", "c")).toBe(true);
    expect(hasSequencePath(edges, "a", "c")).toBe(true);
    expect(hasSequencePath(edges, "c", "a")).toBe(false);
  });

  it("explains disconnected graphs with multiple starts and ends", () => {
    const analysis = analyzeWorkflowGraph(nodes, [
      { source: "a", target: "b", type: "sequence" },
      { source: "c", target: "d", type: "sequence" },
    ]);

    expect(analysis.valid).toBe(false);
    expect(analysis.issues.map((issue) => issue.code)).toEqual([
      "disconnected",
      "multiple_starts",
      "multiple_ends",
    ]);
    expect(analysis.roots.map((node) => node.id)).toEqual(["a", "c"]);
    expect(analysis.sinks.map((node) => node.id)).toEqual(["b", "d"]);
  });

  it("validates three parallel branches that converge on one join", () => {
    const parallelNodes: WorkflowNode[] = [
      "architect",
      "frontend",
      "backend",
      "database",
      "testing",
      "qa",
    ].map((id) => ({ id, agent_id: id, label: id }));
    const analysis = analyzeWorkflowGraph(parallelNodes, [
      { source: "architect", target: "frontend" },
      { source: "architect", target: "backend" },
      { source: "architect", target: "database" },
      { source: "frontend", target: "testing" },
      { source: "backend", target: "testing" },
      { source: "database", target: "testing" },
      { source: "testing", target: "qa" },
    ]);

    expect(analysis).toMatchObject({
      valid: true,
      branchCount: 1,
      joinCount: 1,
    });
    expect(analysis.roots.map((node) => node.id)).toEqual(["architect"]);
    expect(analysis.sinks.map((node) => node.id)).toEqual(["qa"]);
  });

  it("detects cycles, duplicate edges and stale references", () => {
    const analysis = analyzeWorkflowGraph(nodes.slice(0, 3), [
      { source: "a", target: "b", type: "sequence" },
      { source: "a", target: "b", type: "sequence" },
      { source: "b", target: "c", type: "sequence" },
      { source: "c", target: "a", type: "sequence" },
      { source: "missing", target: "a", type: "sequence" },
    ]);

    expect(analysis.valid).toBe(false);
    expect(analysis.issues.map((issue) => issue.code)).toEqual([
      "invalid_reference",
      "duplicate_connection",
      "cycle",
    ]);
  });

  it("validates controlled loops separately from the main graph", () => {
    const linearEdges = [
      { source: "a", target: "b", type: "sequence" as const },
      { source: "b", target: "c", type: "sequence" as const },
      { source: "c", target: "d", type: "sequence" as const },
    ];
    expect(
      analyzeWorkflowGraph(nodes, [
        ...linearEdges,
        {
          source: "d",
          target: "a",
          type: "loop",
          mode: "fixed",
          iterations: 2,
        },
      ]).valid,
    ).toBe(true);

    const invalid = analyzeWorkflowGraph(nodes, [
      ...linearEdges,
      {
        source: "b",
        target: "c",
        type: "loop",
        mode: "fixed",
        iterations: 1,
      },
    ]);
    expect(invalid.valid).toBe(false);
    expect(invalid.issues.map((issue) => issue.code)).toContain("invalid_loop");
  });

  it("requires evaluator nodes to close a condition loop", () => {
    const evaluatorNodes = nodes.slice(0, 2).map((node, index) =>
      index === 1
        ? {
            ...node,
            kind: "evaluator" as const,
            evaluator: { condition: "Aprobar", max_iterations: 3 },
          }
        : node,
    );
    const analysis = analyzeWorkflowGraph(evaluatorNodes, [
      { source: "a", target: "b", type: "sequence" },
    ]);

    expect(analysis.valid).toBe(false);
    expect(analysis.issues.map((issue) => issue.code)).toContain("invalid_evaluator");
  });
});
