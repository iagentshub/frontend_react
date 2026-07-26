import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/api/client";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowStepEditor } from "./workflow-step-editor";
import type { AgentOption, Workflow, WorkflowNode, WorkflowProgress } from "./types";

function emptyWorkflow(): Workflow {
  return { name: "Nueva orquestación", description: "", definition: { nodes: [], edges: [] } };
}

function withLinearEdges(workflow: Workflow): Workflow {
  return {
    ...workflow,
    definition: {
      ...workflow.definition,
      edges: workflow.definition.nodes.slice(1).map((node, index) => ({
        source: workflow.definition.nodes[index]!.id,
        target: node.id,
      })),
    },
  };
}

function fingerprint(workflow: Workflow): string {
  const normalized = withLinearEdges(workflow);
  return JSON.stringify({
    name: normalized.name,
    description: normalized.description,
    definition: normalized.definition,
  });
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WorkflowBuilderDialog({
  workflow,
  agents,
  onClose,
  onSaved,
  onDeleted,
}: {
  workflow: Workflow | null;
  agents: AgentOption[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const initial = useMemo(() => workflow ?? emptyWorkflow(), [workflow]);
  const [draft, setDraft] = useState<Workflow>(initial);
  const [agentId, setAgentId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    initial.definition.nodes[0]?.id,
  );
  const [progress, setProgress] = useState<WorkflowProgress>({ stages: {}, running: false });
  const normalizedDraft = useMemo(() => withLinearEdges(draft), [draft]);
  const dirty = fingerprint(draft) !== fingerprint(initial);
  const selectedNode = draft.definition.nodes.find((node) => node.id === selectedNodeId);

  const save = useMutation({
    mutationFn: () => api.post<Workflow>("/api/workflows", normalizedDraft),
    onSuccess: (saved) => {
      setDraft(saved);
      onSaved();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${encodeURIComponent(id)}`),
    onSuccess: onDeleted,
  });

  const requestClose = () => {
    if (!dirty || confirm("Hay cambios sin guardar. ¿Quieres descartarlos?")) onClose();
  };

  const updateNodes = (nodes: WorkflowNode[]) => {
    setDraft((current) => ({ ...current, definition: { ...current.definition, nodes } }));
    setProgress({ stages: {}, running: false });
  };

  const addAgent = () => {
    if (!agentId) return;
    const agent = agents.find((item) => item.id === agentId);
    const node: WorkflowNode = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      label: agent?.name || agentId,
      instruction: "",
    };
    updateNodes([...draft.definition.nodes, node]);
    setSelectedNodeId(node.id);
    setAgentId("");
  };

  const moveNode = (id: string, direction: -1 | 1) => {
    const nodes = [...draft.definition.nodes];
    const index = nodes.findIndex((node) => node.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= nodes.length) return;
    [nodes[index], nodes[target]] = [nodes[target]!, nodes[index]!];
    updateNodes(nodes);
  };

  const operationError = save.error || remove.error;

  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="modal-box" style={{ width: 880, maxWidth: "95vw" }}>
        <div className="modal-header">
          <div>
            <span className="workflow-section-label">Configuración</span>
            <h3 className="modal-title" id="workflow-dialog-title">
              {draft.id ? "Editar orquestación" : "Nueva orquestación"}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`workflow-save-state ${dirty ? "dirty" : ""}`}>
              {dirty ? "Cambios sin guardar" : draft.id ? "Guardado" : "Nuevo"}
            </span>
            <button className="modal-close" onClick={requestClose} aria-label="Cerrar">
              ×
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="workflow-fields">
            <label>
              Nombre
              <input
                className="input workflow-name"
                value={draft.name}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label>
              Resultado esperado
              <input
                className="input"
                value={draft.description}
                maxLength={2000}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder="Ej.: analiza una petición, implementa la solución y la revisa"
              />
            </label>
          </div>

          <section className="workflow-builder">
            <div className="workflow-builder-heading">
              <div>
                <span className="workflow-section-label">Pipeline</span>
                <h2>Secuencia de agentes</h2>
              </div>
              <span>{draft.definition.nodes.length}/30 pasos</span>
            </div>
            <div className="workflow-add">
              <select
                className="input"
                value={agentId}
                disabled={agents.length === 0 || draft.definition.nodes.length >= 30}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="">
                  {agents.length === 0 ? "Cargando agentes…" : "Selecciona un agente…"}
                </option>
                {agents.map((agent) => (
                  <option value={agent.id} key={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                disabled={!agentId || draft.definition.nodes.length >= 30}
                onClick={addAgent}
              >
                Añadir paso
              </button>
            </div>
            <WorkflowCanvas
              nodes={draft.definition.nodes}
              agents={agents}
              selectedId={selectedNodeId}
              stages={progress.stages}
              onSelect={setSelectedNodeId}
              onMove={moveNode}
              onRemove={(id) => {
                updateNodes(draft.definition.nodes.filter((node) => node.id !== id));
                if (selectedNodeId === id) setSelectedNodeId(undefined);
              }}
            />

            {selectedNode && (
              <WorkflowStepEditor
                node={selectedNode}
                onChange={(instruction) =>
                  updateNodes(
                    draft.definition.nodes.map((node) =>
                      node.id === selectedNode.id ? { ...node, instruction } : node,
                    ),
                  )
                }
              />
            )}
          </section>

          {draft.id && (
            <WorkflowRunner
              key={`${draft.id}:${draft.updated_at ?? ""}`}
              workflowId={draft.id}
              disabledReason={
                dirty ? "Guarda los cambios antes de ejecutar la orquestación." : undefined
              }
              onProgress={setProgress}
            />
          )}

          {operationError && (
            <p className="form-error">
              {operationError instanceof Error
                ? operationError.message
                : "No se pudo completar la operación"}
            </p>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {draft.id && (
              <button
                type="button"
                className="btn-icon btn-icon--danger"
                title="Eliminar orquestación"
                aria-label="Eliminar orquestación"
                disabled={remove.isPending || progress.running}
                onClick={() => {
                  if (confirm(`¿Eliminar «${draft.name}» definitivamente?`)) remove.mutate(draft.id!);
                }}
              >
                <DeleteIcon />
              </button>
            )}
            {!draft.definition.nodes.length && (
              <small style={{ color: "var(--text-2)" }}>Añade al menos un agente para guardar.</small>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={requestClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              !dirty ||
              !draft.name.trim() ||
              !draft.definition.nodes.length ||
              save.isPending ||
              progress.running
            }
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Guardando…" : "Guardar orquestación"}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
