import { hydrateWorkflowPositions } from "./workflow-layout";
import type { Workflow, WorkflowEdge, WorkflowNode } from "./types";

export type WorkflowGraphIssueCode =
  | "empty"
  | "invalid_reference"
  | "self_connection"
  | "duplicate_connection"
  | "disconnected"
  | "multiple_starts"
  | "multiple_ends"
  | "cycle"
  | "invalid_loop"
  | "overlapping_loops"
  | "invalid_evaluator";

export interface WorkflowGraphIssue {
  code: WorkflowGraphIssueCode;
  nodeIds: string[];
}

export interface WorkflowGraphAnalysis {
  valid: boolean;
  issues: WorkflowGraphIssue[];
  roots: WorkflowNode[];
  sinks: WorkflowNode[];
  topologicalOrder: string[];
  branchCount: number;
  joinCount: number;
}

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

export function hasSequencePath(edges: WorkflowEdge[], source: string, target: string): boolean {
  const outgoing = new Map<string, string[]>();
  for (const edge of sequenceEdges(edges)) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }
  const pending = [source];
  const seen = new Set<string>();
  while (pending.length) {
    const current = pending.pop()!;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }
  return false;
}

export function analyzeWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): WorkflowGraphAnalysis {
  if (!nodes.length) {
    return {
      valid: false,
      issues: [{ code: "empty", nodeIds: [] }],
      roots: [],
      sinks: [],
      topologicalOrder: [],
      branchCount: 0,
      joinCount: 0,
    };
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const issues: WorkflowGraphIssue[] = [];
  const validEdges: WorkflowEdge[] = [];
  const seenEdges = new Set<string>();
  const invalidReferences = new Set<string>();
  const selfConnections = new Set<string>();
  const duplicates = new Set<string>();

  for (const edge of sequenceEdges(edges)) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      if (nodeIds.has(edge.source)) invalidReferences.add(edge.source);
      if (nodeIds.has(edge.target)) invalidReferences.add(edge.target);
      continue;
    }
    if (edge.source === edge.target) {
      selfConnections.add(edge.source);
      continue;
    }
    const key = `${edge.source}\u0000${edge.target}`;
    if (seenEdges.has(key)) {
      duplicates.add(edge.source);
      duplicates.add(edge.target);
      continue;
    }
    seenEdges.add(key);
    validEdges.push(edge);
  }

  if (invalidReferences.size) {
    issues.push({ code: "invalid_reference", nodeIds: [...invalidReferences] });
  }
  if (selfConnections.size) {
    issues.push({ code: "self_connection", nodeIds: [...selfConnections] });
  }
  if (duplicates.size) {
    issues.push({ code: "duplicate_connection", nodeIds: [...duplicates] });
  }

  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]));
  const undirected = new Map(nodes.map((node) => [node.id, [] as string[]]));
  for (const edge of validEdges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)!.push(edge.target);
    undirected.get(edge.source)!.push(edge.target);
    undirected.get(edge.target)!.push(edge.source);
  }

  const roots = nodes.filter((node) => incoming.get(node.id) === 0);
  const sinks = nodes.filter((node) => outgoing.get(node.id)!.length === 0);
  const pendingIncoming = new Map(incoming);
  const queue = roots.map((node) => node.id);
  const topologicalOrder: string[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    topologicalOrder.push(current);
    for (const target of outgoing.get(current) ?? []) {
      const remaining = (pendingIncoming.get(target) ?? 0) - 1;
      pendingIncoming.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }

  if (topologicalOrder.length !== nodes.length) {
    const ordered = new Set(topologicalOrder);
    issues.push({
      code: "cycle",
      nodeIds: nodes.filter((node) => !ordered.has(node.id)).map((node) => node.id),
    });
  }

  const connected = new Set<string>();
  const pending = [nodes[0]!.id];
  while (pending.length) {
    const current = pending.pop()!;
    if (connected.has(current)) continue;
    connected.add(current);
    pending.push(...(undirected.get(current) ?? []));
  }
  if (connected.size !== nodes.length) {
    issues.push({
      code: "disconnected",
      nodeIds: nodes.filter((node) => !connected.has(node.id)).map((node) => node.id),
    });
  }
  if (roots.length > 1) {
    issues.push({ code: "multiple_starts", nodeIds: roots.map((node) => node.id) });
  }
  if (sinks.length > 1) {
    issues.push({ code: "multiple_ends", nodeIds: sinks.map((node) => node.id) });
  }

  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const indexes = new Map(topologicalOrder.map((id, index) => [id, index]));
  const invalidLoops = new Set<string>();
  const overlappingLoops = new Set<string>();
  const invalidEvaluators = new Set<string>();
  const loopKeys = new Set<string>();
  const loopSources = new Set<string>();
  const conditionSources = new Set<string>();
  const loopIntervals: Array<{ start: number; end: number; source: string }> = [];

  for (const edge of edges.filter((candidate) => candidate.type === "loop")) {
    const sourceNode = nodesById.get(edge.source);
    const targetNode = nodesById.get(edge.target);
    const key = `${edge.source}\u0000${edge.target}`;
    if (
      !sourceNode ||
      !targetNode ||
      edge.source === edge.target ||
      loopKeys.has(key) ||
      loopSources.has(edge.source) ||
      !hasSequencePath(validEdges, edge.target, edge.source)
    ) {
      if (sourceNode) invalidLoops.add(sourceNode.id);
      if (targetNode) invalidLoops.add(targetNode.id);
      continue;
    }
    loopKeys.add(key);
    loopSources.add(edge.source);

    const mode = edge.mode ?? "fixed";
    if (mode === "condition") {
      conditionSources.add(edge.source);
      if (
        sourceNode.kind !== "evaluator" ||
        !sourceNode.evaluator?.condition.trim() ||
        sourceNode.evaluator.max_iterations < 2 ||
        sourceNode.evaluator.max_iterations > 20
      ) {
        invalidEvaluators.add(sourceNode.id);
      }
    } else if (
      mode !== "fixed" ||
      sourceNode.kind === "evaluator" ||
      (edge.iterations ?? 2) < 2 ||
      (edge.iterations ?? 2) > 20
    ) {
      invalidLoops.add(sourceNode.id);
    }

    const start = indexes.get(edge.target);
    const end = indexes.get(edge.source);
    if (start === undefined || end === undefined || start >= end) {
      invalidLoops.add(sourceNode.id);
      continue;
    }
    for (const interval of loopIntervals) {
      if (!(end < interval.start || start > interval.end)) {
        overlappingLoops.add(sourceNode.id);
        overlappingLoops.add(interval.source);
      }
    }
    loopIntervals.push({ start, end, source: sourceNode.id });
  }

  for (const node of nodes) {
    if (node.kind === "evaluator" && !conditionSources.has(node.id)) {
      invalidEvaluators.add(node.id);
    }
  }
  if (invalidLoops.size) {
    issues.push({ code: "invalid_loop", nodeIds: [...invalidLoops] });
  }
  if (overlappingLoops.size) {
    issues.push({ code: "overlapping_loops", nodeIds: [...overlappingLoops] });
  }
  if (invalidEvaluators.size) {
    issues.push({ code: "invalid_evaluator", nodeIds: [...invalidEvaluators] });
  }

  return {
    valid: issues.length === 0,
    issues,
    roots,
    sinks,
    topologicalOrder,
    branchCount: [...outgoing.values()].filter((targets) => targets.length > 1).length,
    joinCount: [...incoming.values()].filter((count) => count > 1).length,
  };
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
  return !hasSequencePath(edges, target, source);
}
