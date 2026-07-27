import { describe, expect, it } from "vitest";
import {
  applyWorkflowLayout,
  hydrateWorkflowPositions,
  nextWorkflowPosition,
  positionsForLayout,
  type WorkflowLayoutPreset,
} from "./workflow-layout";
import type { WorkflowNode } from "./types";

const nodes = (count: number): WorkflowNode[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `node-${index}`,
    agent_id: `agent-${index}`,
    label: `Agent ${index}`,
  }));

describe("workflow layouts", () => {
  it.each<WorkflowLayoutPreset>(["horizontal", "vertical", "grid", "circle"])(
    "creates finite unique positions for %s",
    (preset) => {
      for (const count of [1, 2, 30]) {
        const positions = positionsForLayout(count, preset);
        expect(positions).toHaveLength(count);
        expect(positions.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
        expect(new Set(positions.map(({ x, y }) => `${x}:${y}`)).size).toBe(count);
      }
    },
  );

  it("changes positions without changing execution order", () => {
    const original = nodes(4);
    const arranged = applyWorkflowLayout(original, "circle");
    expect(arranged.map((node) => node.id)).toEqual(original.map((node) => node.id));
  });

  it("hydrates legacy nodes while preserving saved positions", () => {
    const legacy = nodes(2);
    legacy[0] = { ...legacy[0]!, position: { x: 17, y: 29 } };
    const hydrated = hydrateWorkflowPositions(legacy);
    expect(hydrated[0]!.position).toEqual({ x: 17, y: 29 });
    expect(hydrated[1]!.position).toBeDefined();
    expect(hydrated.every((node) => node.kind === "agent")).toBe(true);
  });

  it("places a new node after the rightmost node", () => {
    const positioned = applyWorkflowLayout(nodes(3), "horizontal");
    expect(nextWorkflowPosition(positioned).x).toBeGreaterThan(positioned[2]!.position!.x);
  });
});
