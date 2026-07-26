import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { LabelsPicker } from "@/components/label-picker";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowStepEditor } from "./workflow-step-editor";
import type { AgentOption, Workflow, WorkflowNode, WorkflowProgress } from "./types";

function emptyWorkflow(name: string): Workflow {
  return { name, description: "", definition: { nodes: [], edges: [] }, labels: ["private"] };
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
    labels: normalized.labels ?? ["private"],
  });
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
  const { t } = useTranslation("workflows");
  const initial = useMemo(() => workflow ?? emptyWorkflow(t("editor.default_name")), [t, workflow]);
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
    onSuccess: async (saved) => {
      setDraft(saved);
      if (saved.id) {
        const isPublic = (saved.labels ?? []).includes("public");
        await api
          .put(`/api/workflows/${encodeURIComponent(saved.id)}/visibility`, {
            is_public: isPublic,
            category: "Other",
          })
          .catch(() => undefined);
      }
      onSaved();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${encodeURIComponent(id)}`),
    onSuccess: onDeleted,
  });

  const requestClose = () => {
    if (!dirty || confirm(t("editor.discard_confirm"))) onClose();
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
            <span className="workflow-section-label">{t("dialog.configuration")}</span>
            <h3 className="modal-title" id="workflow-dialog-title">
              {draft.id ? t("dialog.edit") : t("page.new")}
            </h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className={`workflow-save-state ${dirty ? "dirty" : ""}`}>
              {dirty ? t("editor.unsaved") : draft.id ? t("dialog.saved") : t("editor.new_state")}
            </span>
            <button className="modal-close" onClick={requestClose} aria-label={t("dialog.close")}>
              ×
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="workflow-fields">
            <label>
              {t("editor.name")}
              <input
                className="input workflow-name"
                value={draft.name}
                maxLength={120}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label>
              {t("editor.expected_result")}
              <input
                className="input"
                value={draft.description}
                maxLength={2000}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                placeholder={t("editor.result_placeholder")}
              />
            </label>

            <div className="field">
              <label>{t("agents.modal.field_labels")}</label>

              <LabelsPicker
                labels={draft.labels ?? ["private"]}
                onChange={(next) => setDraft({ ...draft, labels: next })}
              />
            </div>
          </div>

          <section className="workflow-builder">
            <div className="workflow-builder-heading">
              <div>
                <span className="workflow-section-label">{t("builder.eyebrow")}</span>
                <h2>{t("dialog.sequence")}</h2>
              </div>
              <span>{t("builder.capacity", { count: draft.definition.nodes.length })}</span>
            </div>
            <div className="workflow-add">
              <select
                className="input"
                value={agentId}
                disabled={agents.length === 0 || draft.definition.nodes.length >= 30}
                onChange={(event) => setAgentId(event.target.value)}
              >
                <option value="">
                  {agents.length === 0 ? t("builder.loading_agents") : t("builder.select_agent")}
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
                {t("builder.add_agent")}
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
              disabledReason={dirty ? t("builder.run_dirty") : undefined}
              onProgress={setProgress}
            />
          )}

          {operationError && (
            <p className="form-error">
              {operationError instanceof Error
                ? operationError.message
                : t("editor.operation_error")}
            </p>
          )}
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {draft.id && (
              <button
                type="button"
                className="btn-icon btn-icon--danger"
                title={t("builder.delete")}
                aria-label={t("builder.delete")}
                disabled={remove.isPending || progress.running}
                onClick={() => {
                  if (confirm(t("editor.delete_confirm", { name: draft.name }))) {
                    remove.mutate(draft.id!);
                  }
                }}
              >
                <DeleteIcon />
              </button>
            )}
            {!draft.definition.nodes.length && (
              <small style={{ color: "var(--text-2)" }}>{t("builder.save_hint")}</small>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={requestClose}>
              {t("share.cancel")}
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
              {save.isPending ? t("builder.saving") : t("builder.save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
