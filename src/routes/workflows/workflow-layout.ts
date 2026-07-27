import type { WorkflowNode, WorkflowPosition } from "./types";

export const WORKFLOW_NODE_WIDTH = 168;
export const WORKFLOW_NODE_HEIGHT = 104;
const HORIZONTAL_GAP = 70;
const VERTICAL_GAP = 60;

export type WorkflowLayoutPreset = "horizontal" | "vertical" | "grid" | "circle";

function roundPosition(position: WorkflowPosition): WorkflowPosition {
  return {
    x: Math.round(position.x * 100) / 100,
    y: Math.round(position.y * 100) / 100,
  };
}

export function positionsForLayout(
  count: number,
  preset: WorkflowLayoutPreset,
): WorkflowPosition[] {
  if (count <= 0) return [];
  if (preset === "horizontal") {
    return Array.from({ length: count }, (_, index) => ({
      x: 80 + index * (WORKFLOW_NODE_WIDTH + HORIZONTAL_GAP),
      y: 140,
    }));
  }
  if (preset === "vertical") {
    return Array.from({ length: count }, (_, index) => ({
      x: 220,
      y: 60 + index * (WORKFLOW_NODE_HEIGHT + VERTICAL_GAP),
    }));
  }
  if (preset === "grid") {
    const columns = Math.ceil(Math.sqrt(count));
    return Array.from({ length: count }, (_, index) => ({
      x: 80 + (index % columns) * (WORKFLOW_NODE_WIDTH + HORIZONTAL_GAP),
      y: 80 + Math.floor(index / columns) * (WORKFLOW_NODE_HEIGHT + VERTICAL_GAP),
    }));
  }
  if (count === 1) return [{ x: 220, y: 150 }];

  const radius = Math.max(190, count * 40);
  const center = { x: radius + 160, y: radius + 100 };
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    return roundPosition({
      x: center.x + Math.cos(angle) * radius - WORKFLOW_NODE_WIDTH / 2,
      y: center.y + Math.sin(angle) * radius - WORKFLOW_NODE_HEIGHT / 2,
    });
  });
}

export function applyWorkflowLayout(
  nodes: WorkflowNode[],
  preset: WorkflowLayoutPreset,
): WorkflowNode[] {
  const positions = positionsForLayout(nodes.length, preset);
  return nodes.map((node, index) => ({ ...node, position: positions[index]! }));
}

export function hydrateWorkflowPositions(nodes: WorkflowNode[]): WorkflowNode[] {
  const defaults = positionsForLayout(nodes.length, "horizontal");
  return nodes.map((node, index) => ({
    ...node,
    kind: node.kind ?? "agent",
    position: node.position ?? defaults[index]!,
  }));
}

export function nextWorkflowPosition(nodes: WorkflowNode[]): WorkflowPosition {
  if (!nodes.length) return positionsForLayout(1, "horizontal")[0]!;
  const hydrated = hydrateWorkflowPositions(nodes);
  const rightmost = hydrated.reduce((current, node) =>
    (node.position?.x ?? 0) > (current.position?.x ?? 0) ? node : current,
  );
  return {
    x: (rightmost.position?.x ?? 80) + WORKFLOW_NODE_WIDTH + HORIZONTAL_GAP,
    y: rightmost.position?.y ?? 140,
  };
}
