import { hydrateWorkflowPositions } from "./workflow-layout";
import type { Workflow, WorkflowEdge, WorkflowNode } from "./types";

export function sequenceEdges(edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.filter((edge) => (edge.type ?? "sequence") === "sequence");
}

export function normalizeLoadedWorkflow(workflow: Workflow): Workflow {
  const nodes = hydrateWorkflowPositions(workflow.definition.nodes);
  const currentSequence = sequenceEdges(workflow.definition.edges);
  const loops = workflow.definition.edges.filter((edge) => edge.type === "loop");
  const legacySequence =
    currentSequence.length === 0 && nodes.length > 1
      ? nodes.slice(1).map((node, index) => ({
          source: nodes[index]!.id,
          target: node.id,
          type: "sequence" as const,
        }))
      : currentSequence;
  return {
    ...workflow,
    definition: {
      ...workflow.definition,
      nodes,
      edges: [...legacySequence, ...loops],
    },
  };
}

export function prepareWorkflowForSave(workflow: Workflow): Workflow {
  return {
    ...workflow,
    definition: {
      ...workflow.definition,
      nodes: hydrateWorkflowPositions(workflow.definition.nodes),
    },
  };
}

export function workflowRoots(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const incoming = new Set(sequenceEdges(edges).map((edge) => edge.target));
  return nodes.filter((node) => !incoming.has(node.id));
}

export function workflowSinks(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
  const outgoing = new Set(sequenceEdges(edges).map((edge) => edge.source));
  return nodes.filter((node) => !outgoing.has(node.id));
}

export function canConnectSequence(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  source: string,
  target: string,
): boolean {
  if (
    source === target ||
    !nodes.some((node) => node.id === source) ||
    !nodes.some((node) => node.id === target) ||
    sequenceEdges(edges).some((edge) => edge.source === source && edge.target === target)
  ) {
    return false;
  }
  const outgoing = new Map<string, string[]>(
    nodes.map((node) => [node.id, []]),
  );
  for (const edge of sequenceEdges(edges)) {
    outgoing.get(edge.source)?.push(edge.target);
  }
  const pending = [target];
  const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === source) return false;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }
  return true;
}
