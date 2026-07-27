import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  NodeToolbar,
  Panel,
  Position,
  ReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  applyWorkflowLayout,
  hydrateWorkflowPositions,
  WORKFLOW_NODE_HEIGHT,
  WORKFLOW_NODE_WIDTH,
  type WorkflowLayoutPreset,
} from "./workflow-layout";
import type {
  AgentOption,
  WorkflowEdge,
  WorkflowEvaluation,
  WorkflowNode,
  WorkflowStageStatus,
} from "./types";

interface CanvasNodeData extends Record<string, unknown> {
  node: WorkflowNode;
  agent: AgentOption | undefined;
  order: number;
  status: WorkflowStageStatus;
  statusLabel: string;
  readonly: boolean;
  first: boolean;
  last: boolean;
  hasLoop: boolean;
  evaluation: WorkflowEvaluation | undefined;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onLoop: (id: string) => void;
  labels: {
    evaluator: string;
    specialized: string;
    unavailable: string;
    configure: string;
    moveBefore: string;
    moveAfter: string;
    createLoop: string;
    editLoop: string;
    remove: string;
  };
}

type CanvasFlowNode = FlowNode<CanvasNodeData, "workflow">;
type EndpointFlowNode = FlowNode<
  { label: string; eyebrow: string; kind: "input" | "output" },
  "endpoint"
>;

function WorkflowAgentNode({ data, selected }: NodeProps<CanvasFlowNode>) {
  const { node, agent, labels } = data;
  const evaluator = node.kind === "evaluator";
  return (
    <>
      <NodeToolbar isVisible={selected && !data.readonly} position={Position.Top}>
        <div className="workflow-node-toolbar">
          <button type="button" onClick={() => data.onSelect(node.id)}>
            {labels.configure}
          </button>
          <button
            type="button"
            disabled={data.first || evaluator}
            onClick={() => data.onMove(node.id, -1)}
            aria-label={labels.moveBefore}
          >
            ←
          </button>
          <button
            type="button"
            disabled={data.last || evaluator}
            onClick={() => data.onMove(node.id, 1)}
            aria-label={labels.moveAfter}
          >
            →
          </button>
          <button type="button" onClick={() => data.onLoop(node.id)}>
            {data.hasLoop ? labels.editLoop : labels.createLoop}
          </button>
          <button
            className="danger"
            type="button"
            onClick={() => data.onRemove(node.id)}
            aria-label={labels.remove}
          >
            ×
          </button>
        </div>
      </NodeToolbar>

      <Handle type="target" position={Position.Left} isConnectable={false} />
      <article
        className={[
          "workflow-flow-node",
          evaluator ? "workflow-flow-node--evaluator" : "",
          `status-${data.status}`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <header className="workflow-flow-drag-handle">
          <span className="workflow-flow-order">{evaluator ? "E" : data.order}</span>
          <span className={`workflow-stage-status status-${data.status}`}>{data.statusLabel}</span>
        </header>
        <div className="workflow-flow-main">
          <span className="workflow-flow-avatar" aria-hidden="true">
            {(agent?.name || node.label || "A").charAt(0).toUpperCase()}
          </span>
          <span>
            <strong>{node.label || agent?.name || node.agent_id}</strong>
            <small>
              {evaluator
                ? labels.evaluator
                : agent?.description
                  ? labels.specialized
                  : labels.unavailable}
            </small>
          </span>
        </div>
        <footer>
          <span className={node.instruction ? "configured" : ""}>
            {node.instruction ? "●" : "○"}
          </span>
          {evaluator && data.evaluation && (
            <em
              className={data.evaluation.approved ? "approved" : "rejected"}
              title={data.evaluation.reason}
            >
              {data.evaluation.approved ? "✓" : "↻"} {data.evaluation.iteration}
            </em>
          )}
          {data.hasLoop && <b aria-label={labels.editLoop}>↻</b>}
        </footer>
      </article>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </>
  );
}

function WorkflowEndpointNode({ data }: NodeProps<EndpointFlowNode>) {
  return (
    <>
      {data.kind === "output" && (
        <Handle type="target" position={Position.Left} isConnectable={false} />
      )}
      <div className="workflow-flow-endpoint">
        <span>{data.eyebrow}</span>
        <strong>{data.label}</strong>
      </div>
      {data.kind === "input" && (
        <Handle type="source" position={Position.Right} isConnectable={false} />
      )}
    </>
  );
}

const nodeTypes = {
  workflow: WorkflowAgentNode,
  endpoint: WorkflowEndpointNode,
};

interface LoopDraft {
  sourceId: string;
  targetId: string;
  mode: "fixed" | "condition";
  iterations: number;
  evaluatorAgentId: string;
  condition: string;
  maxIterations: number;
  existingEvaluator: boolean;
  existingLoop: boolean;
}

function rangesOverlap(first: [number, number], second: [number, number]) {
  return !(first[1] < second[0] || first[0] > second[1]);
}

export function WorkflowCanvas({
  nodes,
  edges,
  agents,
  onChange,
  onSelect,
  selectedId,
  stages,
  evaluations = {},
  readonly = false,
}: {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  agents: AgentOption[];
  onChange: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onSelect: (id: string) => void;
  selectedId?: string | undefined;
  stages: Record<string, WorkflowStageStatus>;
  evaluations?: Record<string, WorkflowEvaluation> | undefined;
  readonly?: boolean;
}) {
  const { t } = useTranslation("workflows");
  const [locked, setLocked] = useState(false);
  const [loopDraft, setLoopDraft] = useState<LoopDraft | null>(null);
  const hydrated = useMemo(() => hydrateWorkflowPositions(nodes), [nodes]);
  const sequenceEdges = useMemo(
    () => edges.filter((edge) => (edge.type ?? "sequence") === "sequence"),
    [edges],
  );
  const loopEdges = useMemo(() => edges.filter((edge) => edge.type === "loop"), [edges]);

  const removeNode = (id: string) => {
    onChange(
      nodes.filter((node) => node.id !== id),
      edges.filter((edge) => edge.source !== id && edge.target !== id),
    );
  };

  const moveNode = (id: string, direction: -1 | 1) => {
    const next = [...nodes];
    const index = next.findIndex((node) => node.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next, edges);
  };

  const openLoop = (sourceId: string) => {
    const source = nodes.find((node) => node.id === sourceId);
    if (!source) return;
    const existing = loopEdges.find((edge) => edge.source === sourceId);
    setLoopDraft({
      sourceId,
      targetId: existing?.target ?? "",
      mode: existing?.mode ?? (source.kind === "evaluator" ? "condition" : "fixed"),
      iterations: existing?.iterations ?? 2,
      evaluatorAgentId: source.kind === "evaluator" ? source.agent_id : "",
      condition: source.evaluator?.condition ?? "",
      maxIterations: source.evaluator?.max_iterations ?? 5,
      existingEvaluator: source.kind === "evaluator",
      existingLoop: Boolean(existing),
    });
  };

  const unavailableTargets = useMemo(() => {
    if (!loopDraft) return new Set<string>();
    const sourceIndex = nodes.findIndex((node) => node.id === loopDraft.sourceId);
    const otherRanges = loopEdges
      .filter((edge) => edge.source !== loopDraft.sourceId)
      .map((edge) => {
        const start = nodes.findIndex((node) => node.id === edge.target);
        const end = nodes.findIndex((node) => node.id === edge.source);
        return [start, end] as [number, number];
      });
    return new Set(
      nodes
        .filter((node, index) => {
          if (node.kind === "evaluator" || index >= sourceIndex) return true;
          return otherRanges.some((range) => rangesOverlap([index, sourceIndex], range));
        })
        .map((node) => node.id),
    );
  }, [loopDraft, loopEdges, nodes]);

  const saveLoop = () => {
    if (!loopDraft?.targetId) return;
    let nextNodes = [...nodes];
    let sourceId = loopDraft.sourceId;
    let nextEdges = edges.filter(
      (edge) => edge.source !== loopDraft.sourceId || edge.type !== "loop",
    );

    if (loopDraft.mode === "condition") {
      if (!loopDraft.evaluatorAgentId || !loopDraft.condition.trim()) return;
      const evaluatorAgent = agents.find((agent) => agent.id === loopDraft.evaluatorAgentId);
      if (loopDraft.existingEvaluator) {
        nextNodes = nextNodes.map((node) =>
          node.id === loopDraft.sourceId
            ? {
                ...node,
                agent_id: loopDraft.evaluatorAgentId,
                label: evaluatorAgent?.name || loopDraft.evaluatorAgentId,
                kind: "evaluator",
                evaluator: {
                  condition: loopDraft.condition.trim(),
                  max_iterations: loopDraft.maxIterations,
                },
              }
            : node,
        );
      } else {
        const sourceIndex = nextNodes.findIndex((node) => node.id === loopDraft.sourceId);
        const source = nextNodes[sourceIndex]!;
        const evaluatorId = crypto.randomUUID();
        const evaluatorNode: WorkflowNode = {
          id: evaluatorId,
          agent_id: loopDraft.evaluatorAgentId,
          label: evaluatorAgent?.name || loopDraft.evaluatorAgentId,
          kind: "evaluator",
          evaluator: {
            condition: loopDraft.condition.trim(),
            max_iterations: loopDraft.maxIterations,
          },
          position: {
            x: (source.position?.x ?? 0) + WORKFLOW_NODE_WIDTH + 70,
            y: source.position?.y ?? 0,
          },
        };
        nextNodes.splice(sourceIndex + 1, 0, evaluatorNode);
        sourceId = evaluatorId;
      }
    }

    nextEdges = [
      ...nextEdges,
      {
        source: sourceId,
        target: loopDraft.targetId,
        type: "loop",
        mode: loopDraft.mode,
        ...(loopDraft.mode === "fixed" ? { iterations: loopDraft.iterations } : {}),
      },
    ];
    onChange(nextNodes, nextEdges);
    setLoopDraft(null);
  };

  const removeLoop = () => {
    if (!loopDraft) return;
    const remainingEdges = edges.filter(
      (edge) => edge.type !== "loop" || edge.source !== loopDraft.sourceId,
    );
    if (loopDraft.existingEvaluator) {
      onChange(
        nodes.filter((node) => node.id !== loopDraft.sourceId),
        remainingEdges.filter(
          (edge) => edge.source !== loopDraft.sourceId && edge.target !== loopDraft.sourceId,
        ),
      );
    } else {
      onChange(nodes, remainingEdges);
    }
    setLoopDraft(null);
  };

  const flowNodes = ((): Array<CanvasFlowNode | EndpointFlowNode> => {
    if (!hydrated.length) return [];
    const first = hydrated[0]!;
    const last = hydrated.at(-1)!;
    const inputPosition = {
      x: (first.position?.x ?? 0) - 150,
      y: (first.position?.y ?? 0) + (WORKFLOW_NODE_HEIGHT - 72) / 2,
    };
    const outputPosition = {
      x: (last.position?.x ?? 0) + WORKFLOW_NODE_WIDTH + 78,
      y: (last.position?.y ?? 0) + (WORKFLOW_NODE_HEIGHT - 72) / 2,
    };
    return [
      {
        id: "__input",
        type: "endpoint",
        position: inputPosition,
        draggable: false,
        selectable: false,
        data: {
          eyebrow: t("legacy.text_6fca55ca3c82"),
          label: t("canvas.input"),
          kind: "input",
        },
      },
      ...hydrated.map((node, index): CanvasFlowNode => ({
        id: node.id,
        type: "workflow",
        position: node.position!,
        selected: selectedId === node.id,
        data: {
          node,
          agent: agents.find((agent) => agent.id === node.agent_id),
          order: index + 1,
          status: stages[node.id] ?? "pending",
          statusLabel: t(`canvas.status.${stages[node.id] ?? "pending"}`),
          readonly,
          first: index === 0,
          last: index === hydrated.length - 1,
          hasLoop: loopEdges.some((edge) => edge.source === node.id),
          evaluation: evaluations[node.id],
          onSelect,
          onMove: moveNode,
          onRemove: removeNode,
          onLoop: openLoop,
          labels: {
            evaluator: t("canvas.evaluator"),
            specialized: t("canvas.specialized"),
            unavailable: t("canvas.unavailable"),
            configure: t("canvas.configure"),
            moveBefore: t("canvas.move_left", { name: node.label }),
            moveAfter: t("canvas.move_right", { name: node.label }),
            createLoop: t("loops.create"),
            editLoop: t("loops.edit"),
            remove: t("canvas.remove", { name: node.label }),
          },
        },
      })),
      {
        id: "__output",
        type: "endpoint",
        position: outputPosition,
        draggable: false,
        selectable: false,
        data: {
          eyebrow: t("legacy.text_5d84eb9e92dc"),
          label: t("canvas.output"),
          kind: "output",
        },
      },
    ];
  })();

  const flowEdges = useMemo<FlowEdge[]>(() => {
    if (!hydrated.length) return [];
    const main: FlowEdge[] = [
      {
        id: "__input-edge",
        source: "__input",
        target: hydrated[0]!.id,
        interactionWidth: 24,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
      },
      ...sequenceEdges.map((edge) => ({
        id: `sequence:${edge.source}:${edge.target}`,
        source: edge.source,
        target: edge.target,
        interactionWidth: 24,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
      })),
      {
        id: "__output-edge",
        source: hydrated.at(-1)!.id,
        target: "__output",
        interactionWidth: 24,
        markerEnd: { type: MarkerType.ArrowClosed, color: "var(--accent)" },
      },
    ];
    const loops: FlowEdge[] = loopEdges.map((edge) => ({
      id: `loop:${edge.source}:${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      className: "workflow-loop-edge",
      animated: true,
      interactionWidth: 28,
      label:
        edge.mode === "condition"
          ? t("loops.condition_short")
          : t("loops.iterations_short", { count: edge.iterations ?? 2 }),
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--warning, #d97706)" },
    }));
    return [...main, ...loops];
  }, [hydrated, loopEdges, sequenceEdges, t]);

  if (!nodes.length) {
    return (
      <div className="workflow-empty">
        <strong>{t("canvas.empty_title")}</strong>
        <p>{t("canvas.empty_description")}</p>
      </div>
    );
  }

  const applyLayout = (preset: WorkflowLayoutPreset) => {
    onChange(applyWorkflowLayout(nodes, preset), edges);
  };

  return (
    <>
      <div className="workflow-canvas" aria-label={t("canvas.aria")}>
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.22 }}
          minZoom={0.25}
          maxZoom={1.8}
          nodesDraggable={!readonly && !locked}
          nodesConnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          onNodesChange={(changes) => {
            const positionChanges = new Map(
              changes.flatMap((change) =>
                change.type === "position" && change.position && !change.id.startsWith("__")
                  ? [[change.id, change.position] as const]
                  : [],
              ),
            );
            if (!positionChanges.size) return;
            onChange(
              nodes.map((item) => {
                const position = positionChanges.get(item.id);
                return position ? { ...item, position: { x: position.x, y: position.y } } : item;
              }),
              edges,
            );
          }}
          onNodeClick={(_, node) => {
            if (!node.id.startsWith("__")) onSelect(node.id);
          }}
          onNodeDragStop={(_, node) => {
            if (readonly || locked || node.id.startsWith("__")) return;
            onChange(
              nodes.map((item) =>
                item.id === node.id
                  ? { ...item, position: { x: node.position.x, y: node.position.y } }
                  : item,
              ),
              edges,
            );
          }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls showInteractive={false} />
          {!readonly && (
            <Panel position="top-right" className="workflow-layout-panel">
              {(["vertical", "horizontal", "grid", "circle"] as const).map((preset) => (
                <button
                  type="button"
                  onClick={() => applyLayout(preset)}
                  title={t(`layout.${preset}`)}
                  aria-label={t(`layout.${preset}`)}
                  key={preset}
                >
                  {t(`layout.${preset}_short`)}
                </button>
              ))}
              <button
                type="button"
                className={locked ? "active" : ""}
                onClick={() => setLocked((value) => !value)}
                aria-pressed={locked}
                title={t(locked ? "layout.unlock" : "layout.lock")}
              >
                {locked ? "🔒" : "◇"}
              </button>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {loopDraft && (
        <div className="workflow-loop-backdrop" role="dialog" aria-modal="true">
          <div className="workflow-loop-dialog">
            <header>
              <div>
                <span className="workflow-section-label">{t("loops.eyebrow")}</span>
                <h3>{t(loopDraft.existingLoop ? "loops.edit" : "loops.create")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setLoopDraft(null)}
                aria-label={t("dialog.close")}
              >
                ×
              </button>
            </header>
            <div className="workflow-loop-body">
              <div className="field">
                <label htmlFor="workflow-loop-target">{t("loops.target")}</label>
                <select
                  id="workflow-loop-target"
                  className="input"
                  value={loopDraft.targetId}
                  onChange={(event) => setLoopDraft({ ...loopDraft, targetId: event.target.value })}
                >
                  <option value="">{t("loops.select_target")}</option>
                  {nodes.map((node, index) => (
                    <option
                      value={node.id}
                      disabled={unavailableTargets.has(node.id)}
                      key={node.id}
                    >
                      {index + 1}. {node.label}
                    </option>
                  ))}
                </select>
              </div>
              {!loopDraft.existingEvaluator && (
                <div className="workflow-loop-modes">
                  {(["fixed", "condition"] as const).map((mode) => (
                    <label key={mode}>
                      <input
                        type="radio"
                        checked={loopDraft.mode === mode}
                        onChange={() => setLoopDraft({ ...loopDraft, mode })}
                      />
                      <span>
                        <strong>{t(`loops.mode_${mode}`)}</strong>
                        <small>{t(`loops.mode_${mode}_hint`)}</small>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {loopDraft.mode === "fixed" ? (
                <div className="field">
                  <label htmlFor="workflow-loop-iterations">{t("loops.iterations")}</label>
                  <input
                    id="workflow-loop-iterations"
                    className="input"
                    type="number"
                    min={2}
                    max={20}
                    value={loopDraft.iterations}
                    onChange={(event) =>
                      setLoopDraft({
                        ...loopDraft,
                        iterations: Math.min(20, Math.max(2, Number(event.target.value))),
                      })
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="workflow-loop-evaluator">{t("loops.evaluator")}</label>
                    <select
                      id="workflow-loop-evaluator"
                      className="input"
                      value={loopDraft.evaluatorAgentId}
                      onChange={(event) =>
                        setLoopDraft({ ...loopDraft, evaluatorAgentId: event.target.value })
                      }
                    >
                      <option value="">{t("loops.select_evaluator")}</option>
                      {agents.map((agent) => (
                        <option value={agent.id} key={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="workflow-loop-condition">{t("loops.condition")}</label>
                    <textarea
                      id="workflow-loop-condition"
                      className="input"
                      rows={4}
                      maxLength={2000}
                      value={loopDraft.condition}
                      onChange={(event) =>
                        setLoopDraft({ ...loopDraft, condition: event.target.value })
                      }
                      placeholder={t("loops.condition_placeholder")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="workflow-loop-max">{t("loops.max_iterations")}</label>
                    <input
                      id="workflow-loop-max"
                      className="input"
                      type="number"
                      min={2}
                      max={20}
                      value={loopDraft.maxIterations}
                      onChange={(event) =>
                        setLoopDraft({
                          ...loopDraft,
                          maxIterations: Math.min(20, Math.max(2, Number(event.target.value))),
                        })
                      }
                    />
                  </div>
                </>
              )}
            </div>
            <footer>
              {loopDraft.existingLoop && (
                <button type="button" className="btn btn-danger" onClick={removeLoop}>
                  {t("loops.remove")}
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setLoopDraft(null)}>
                {t("share.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !loopDraft.targetId ||
                  (loopDraft.mode === "condition" &&
                    (!loopDraft.evaluatorAgentId || !loopDraft.condition.trim()))
                }
                onClick={saveLoop}
              >
                {t("loops.save")}
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
