import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowStepEditor } from "./workflow-step-editor";
import type { AgentOption, Workflow, WorkflowNode, WorkflowProgress } from "./types";
import "./workflows.css";

const emptyWorkflow = (): Workflow => ({
  name: "Nueva orquestación",
  description: "",
  definition: { nodes: [], edges: [] },
});

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

export function WorkflowsPage() {
  const workflows = useQuery({
    queryKey: ["workflows"],
    queryFn: ({ signal }) => api.get<Workflow[]>("/api/workflows", signal),
  });
  const agents = useQuery({
    queryKey: ["agents", "workflow-options"],
    queryFn: ({ signal }) => api.get<AgentOption[]>("/api/agents", signal),
  });
  const [draft, setDraft] = useState<Workflow>(emptyWorkflow);
  const [savedFingerprint, setSavedFingerprint] = useState(() => fingerprint(emptyWorkflow()));
  const [agentId, setAgentId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [progress, setProgress] = useState<WorkflowProgress>({
    stages: {},
    running: false,
  });
  const normalizedDraft = useMemo(() => withLinearEdges(draft), [draft]);
  const dirty = fingerprint(draft) !== savedFingerprint;
  const selectedNode = draft.definition.nodes.find((node) => node.id === selectedNodeId);

  const save = useMutation({
    mutationFn: () => api.post<Workflow>("/api/workflows", normalizedDraft),
    onSuccess: async (saved) => {
      setDraft(saved);
      setSavedFingerprint(fingerprint(saved));
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      const fresh = emptyWorkflow();
      setDraft(fresh);
      setSavedFingerprint(fingerprint(fresh));
      setSelectedNodeId(undefined);
      setProgress({ stages: {}, running: false });
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const confirmDiscard = () => !dirty || confirm("Hay cambios sin guardar. ¿Quieres descartarlos?");

  const createNew = () => {
    if (!confirmDiscard()) return;
    const fresh = emptyWorkflow();
    setDraft(fresh);
    setSavedFingerprint(fingerprint(fresh));
    setSelectedNodeId(undefined);
    setProgress({ stages: {}, running: false });
  };

  const selectWorkflow = (workflow: Workflow) => {
    if (draft.id === workflow.id || !confirmDiscard()) return;
    setDraft(workflow);
    setSavedFingerprint(fingerprint(workflow));
    setSelectedNodeId(workflow.definition.nodes[0]?.id);
    setProgress({ stages: {}, running: false });
  };

  const updateNodes = (nodes: WorkflowNode[]) => {
    setDraft((current) => ({
      ...current,
      definition: { ...current.definition, nodes },
    }));
    setProgress({ stages: {}, running: false });
  };

  const addAgent = () => {
    if (!agentId) return;
    const agent = agents.data?.find((item) => item.id === agentId);
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
    <main className="page-content workflows-page">
      <header className="workflows-header">
        <div>
          <span className="workflow-eyebrow">Automatización multiagente</span>
          <h1>Orquestación</h1>
          <p>Convierte varios agentes en un proceso ordenado, comprobable y reutilizable.</p>
        </div>
        <button className="btn btn-primary" onClick={createNew}>
          <span aria-hidden="true">＋</span> Nueva orquestación
        </button>
      </header>

      <div className="workflows-layout">
        <WorkflowSidebar
          workflows={workflows.data ?? []}
          activeId={draft.id}
          pending={workflows.isPending}
          error={workflows.isError}
          onSelect={selectWorkflow}
        />

        <section className="workflow-editor">
          <header className="workflow-editor-header">
            <div>
              <span className="workflow-section-label">Configuración</span>
              <h2>
                {draft.id
                  ? "Editar orquestación"
                  : "Diseñar una orquestación nueva"}
              </h2>
            </div>
            <span className={`workflow-save-state ${dirty ? "dirty" : ""}`}>
              {dirty ? "Cambios sin guardar" : draft.id ? "Guardado" : "Nuevo"}
            </span>
          </header>

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
                disabled={agents.isPending || draft.definition.nodes.length >= 30}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="">
                  {agents.isPending ? "Cargando agentes…" : "Selecciona un agente…"}
                </option>
                {agents.data?.map((agent) => (
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
              agents={agents.data ?? []}
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
                dirty
                  ? "Guarda los cambios antes de ejecutar la orquestación."
                  : undefined
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
          <footer className="workflow-actions">
            {draft.id && (
              <button
                className="btn btn-ghost workflow-delete"
                disabled={remove.isPending || progress.running}
                onClick={() => {
                  if (confirm(`¿Eliminar «${draft.name}» definitivamente?`)) {
                    remove.mutate(draft.id!);
                  }
                }}
              >
                {remove.isPending ? "Eliminando…" : "Eliminar"}
              </button>
            )}
            <div>
              {!draft.definition.nodes.length && (
                <small>Añade al menos un agente para guardar.</small>
              )}
              <button
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
          </footer>
        </section>
      </div>
    </main>
  );
}
