import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { LabelChips } from "@/components/label-chips";
import { LabelsPicker } from "@/components/label-picker";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowBuilderDialog } from "./workflow-builder-dialog";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowCatalog } from "./workflow-sidebar";
import { WorkflowShareDialog } from "./workflow-share-dialog";
import { WorkflowStepEditor } from "./workflow-step-editor";
import { hydrateWorkflowPositions, nextWorkflowPosition } from "./workflow-layout";
import type {
  AgentOption,
  Workflow,
  WorkflowNode,
  WorkflowProgress,
  WorkflowWorkspace,
} from "./types";
import "./workflows.css";
import "../../../assets/components/group-panel/group-panel.css";

const emptyWorkflow = (name: string): Workflow => ({
  name,
  description: "",
  definition: { nodes: [], edges: [] },
  labels: ["private"],
});

function withLinearEdges(workflow: Workflow): Workflow {
  const nodes = hydrateWorkflowPositions(workflow.definition.nodes);
  const loops = workflow.definition.edges.filter((edge) => edge.type === "loop");
  return {
    ...workflow,
    definition: {
      ...workflow.definition,
      nodes,
      edges: [
        ...nodes.slice(1).map((node, index) => ({
          source: nodes[index]!.id,
          target: node.id,
          type: "sequence" as const,
        })),
        ...loops,
      ],
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
  const { t } = useTranslation("workflows");
  const defaultName = t("editor.default_name");
  const workflows = useQuery({
    queryKey: ["workflows"],
    queryFn: ({ signal }) => api.get<Workflow[]>("/api/workflows", signal),
  });
  const agents = useQuery({
    queryKey: ["agents", "workflow-options"],
    queryFn: ({ signal }) => api.get<AgentOption[]>("/api/agents", signal),
  });
  const workspaces = useQuery({
    queryKey: ["workspaces"],
    queryFn: ({ signal }) => api.get<WorkflowWorkspace[]>("/api/workspaces", signal),
  });
  const [draft, setDraft] = useState<Workflow>(() => emptyWorkflow(defaultName));
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    fingerprint(emptyWorkflow(defaultName)),
  );
  const [agentId, setAgentId] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [progress, setProgress] = useState<WorkflowProgress>({
    stages: {},
    running: false,
  });
  const [view, setView] = useState<"catalog" | "editor">("catalog");
  const [viewOnly, setViewOnly] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Workflow>();
  const [shareNotice, setShareNotice] = useState("");
  const normalizedDraft = useMemo(() => withLinearEdges(draft), [draft]);
  const dirty = fingerprint(draft) !== savedFingerprint;
  const isShared = Boolean(draft._shared);
  const readonly = viewOnly || isShared;
  const selectedNode = draft.definition.nodes.find((node) => node.id === selectedNodeId);
  const configuredNodes = draft.definition.nodes.filter((node) => node.instruction?.trim()).length;
  const readinessChecks = [
    { label: t("health.name"), ready: Boolean(draft.name.trim()) },
    { label: t("health.objective"), ready: Boolean(draft.description.trim()) },
    { label: t("health.pipeline"), ready: draft.definition.nodes.length > 0 },
  ];
  const readyChecks = readinessChecks.filter((check) => check.ready).length;

  const save = useMutation({
    mutationFn: () => api.post<Workflow>("/api/workflows", normalizedDraft),
    onSuccess: async (saved) => {
      setDraft(saved);
      setSavedFingerprint(fingerprint(saved));
      if (saved.id) {
        const isPublic = (saved.labels ?? []).includes("public");
        await api
          .put(`/api/workflows/${encodeURIComponent(saved.id)}/visibility`, {
            is_public: isPublic,
            category: "Other",
          })
          .catch(() => undefined);
      }
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${encodeURIComponent(id)}`),
    onSuccess: async () => {
      const fresh = emptyWorkflow(defaultName);
      setDraft(fresh);
      setSavedFingerprint(fingerprint(fresh));
      setSelectedNodeId(undefined);
      setProgress({ stages: {}, running: false });
      setView("catalog");
      await queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });

  const confirmDiscard = () => !dirty || confirm(t("editor.discard_confirm"));

  const createNew = () => {
    if (!confirmDiscard()) return;
    setCreateDialogOpen(true);
  };

  const selectWorkflow = (workflow: Workflow) => {
    if (!confirmDiscard()) return;
    const hydrated = withLinearEdges(workflow);
    setDraft(hydrated);
    setSavedFingerprint(fingerprint(hydrated));
    setSelectedNodeId(hydrated.definition.nodes[0]?.id);
    setProgress({ stages: {}, running: false });
    setViewOnly(false);
    setView("editor");
  };

  const viewWorkflow = (workflow: Workflow) => {
    if (!confirmDiscard()) return;
    const hydrated = withLinearEdges(workflow);
    setDraft(hydrated);
    setSavedFingerprint(fingerprint(hydrated));
    setSelectedNodeId(hydrated.definition.nodes[0]?.id);
    setProgress({ stages: {}, running: false });
    setViewOnly(true);
    setView("editor");
  };

  const openCatalog = () => {
    if (!confirmDiscard()) return;
    const savedWorkflow = workflows.data?.find((workflow) => workflow.id === draft.id);
    const nextDraft = withLinearEdges(savedWorkflow ?? emptyWorkflow(defaultName));
    setDraft(nextDraft);
    setSavedFingerprint(fingerprint(nextDraft));
    setSelectedNodeId(undefined);
    setProgress({ stages: {}, running: false });
    setViewOnly(false);
    setView("catalog");
  };

  const updateDefinition = (nodes: WorkflowNode[], edges = draft.definition.edges) => {
    setDraft((current) => ({
      ...withLinearEdges({
        ...current,
        definition: { ...current.definition, nodes, edges },
      }),
    }));
    setProgress({ stages: {}, running: false });
  };

  const updateNodes = (nodes: WorkflowNode[]) => updateDefinition(nodes);

  const addAgent = () => {
    if (!agentId) return;
    const agent = agents.data?.find((item) => item.id === agentId);
    const node: WorkflowNode = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      label: agent?.name || agentId,
      instruction: "",
      kind: "agent",
      position: nextWorkflowPosition(draft.definition.nodes),
    };
    updateNodes([...draft.definition.nodes, node]);
    setSelectedNodeId(node.id);
    setAgentId("");
  };

  const operationError = save.error || remove.error;

  return (
    <main className="page-content workflows-page">
      <header className="page-header workflows-header">
        <div>
          {view === "editor" && (
            <button className="workflow-back" type="button" onClick={openCatalog}>
              {t("page.back")}
            </button>
          )}

          <h1 className="page-title">
            {view === "catalog" ? t("page.title") : draft.id ? draft.name : t("page.new")}
          </h1>

          <p className="page-subtitle">
            {view === "catalog" ? t("page.subtitle") : t("page.editor_subtitle")}
          </p>
        </div>

        {view === "catalog" && (
          <div className="page-actions">
            <button className="btn btn-primary page-primary-action" onClick={createNew}>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <path
                  d="M6.5 1v11M1 6.5h11"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              {t("page.new")}
            </button>
          </div>
        )}
      </header>

      {view === "catalog" ? (
        <WorkflowCatalog
          workflows={workflows.data ?? []}
          pending={workflows.isPending}
          error={workflows.isError}
          onSelect={selectWorkflow}
          onView={viewWorkflow}
          onShare={setShareTarget}
          onDelete={(workflow) => {
            if (confirm(t("editor.delete_confirm", { name: workflow.name }))) {
              remove.mutate(workflow.id!);
            }
          }}
          workspaces={workspaces.data ?? []}
        />
      ) : (
        <div className="workflows-layout">
          <section className="workflow-editor">
            <header className="workflow-editor-header">
              <div>
                <span className="workflow-section-label">
                  {draft.id
                    ? t("editor.resource", { id: draft.id.slice(0, 8) })
                    : t("editor.draft")}
                </span>

                <h2>{draft.id ? draft.name : t("editor.new_design")}</h2>
              </div>

              <div className="workflow-editor-status">
                <span className="workflow-environment">
                  {isShared
                    ? t("editor.shared_access")
                    : viewOnly
                      ? t("editor.view_access")
                      : t("editor.production")}
                </span>

                <span className={`workflow-save-state ${dirty ? "dirty" : ""}`}>
                  {readonly
                    ? t("editor.readonly")
                    : dirty
                      ? t("editor.unsaved")
                      : draft.id
                        ? t("editor.synced")
                        : t("editor.new_state")}
                </span>
              </div>
            </header>

            <div className="workflow-overview">
              <div className="workflow-fields">
                <label>
                  {t("editor.name")}

                  <input
                    className="input workflow-name"
                    value={draft.name}
                    maxLength={120}
                    disabled={readonly}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  />
                </label>

                <label>
                  {t("editor.expected_result")}

                  <input
                    className="input"
                    value={draft.description}
                    maxLength={2000}
                    disabled={readonly}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    placeholder={t("editor.result_placeholder")}
                  />
                </label>

                <div className="field">
                  <label>{t("agents.modal.field_labels")}</label>

                  {readonly ? (
                    <LabelChips labels={draft.labels} hidePrivate={false} />
                  ) : (
                    <LabelsPicker
                      labels={draft.labels ?? ["private"]}
                      onChange={(next) => setDraft({ ...draft, labels: next })}
                    />
                  )}
                </div>
              </div>

              <div className="workflow-health" aria-label={t("health.aria")}>
                <div className="workflow-health-score">
                  <span>
                    {readyChecks}/{readinessChecks.length}
                  </span>

                  <small>{t("health.ready_count")}</small>
                </div>

                <div className="workflow-health-checks">
                  {readinessChecks.map((check) => (
                    <span className={check.ready ? "ready" : ""} key={check.label}>
                      <i aria-hidden="true">{check.ready ? "✓" : "—"}</i>

                      {check.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <section className="workflow-builder">
              <div className="workflow-builder-heading">
                <div>
                  <span className="workflow-section-label">{t("builder.eyebrow")}</span>

                  <h2>{t("builder.title")}</h2>

                  <p>{t("builder.description")}</p>
                </div>

                <div className="workflow-pipeline-metrics" aria-label={t("builder.metrics_aria")}>
                  <span>
                    <strong>{draft.definition.nodes.length}</strong> {t("builder.agents")}
                  </span>

                  <span>
                    <strong>{Math.max(0, draft.definition.nodes.length - 1)}</strong>{" "}
                    {t("builder.links")}
                  </span>

                  <span>
                    <strong>{configuredNodes}</strong>
                    {t("builder.instructions")}
                  </span>
                </div>
              </div>

              <div className="workflow-add">
                <div>
                  <span className="workflow-add-label">{t("builder.add_label")}</span>

                  <select
                    className="input"
                    value={agentId}
                    disabled={readonly || agents.isPending || draft.definition.nodes.length >= 30}
                    onChange={(event) => setAgentId(event.target.value)}
                  >
                    <option value="">
                      {agents.isPending ? t("builder.loading_agents") : t("builder.select_agent")}
                    </option>

                    {agents.data?.map((agent) => (
                      <option value={agent.id} key={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-primary"
                  disabled={readonly || !agentId || draft.definition.nodes.length >= 30}
                  onClick={addAgent}
                >
                  <span aria-hidden="true">＋</span>
                  {t("builder.add_agent")}
                </button>

                <span className="workflow-capacity">
                  {t("builder.capacity", { count: draft.definition.nodes.length })}
                </span>
              </div>

              <WorkflowCanvas
                nodes={draft.definition.nodes}
                edges={draft.definition.edges}
                agents={agents.data ?? []}
                selectedId={selectedNodeId}
                stages={progress.stages}
                evaluations={progress.evaluations}
                readonly={readonly}
                onSelect={setSelectedNodeId}
                onChange={(nodes, edges) => {
                  updateDefinition(nodes, edges);
                  if (selectedNodeId && !nodes.some((node) => node.id === selectedNodeId)) {
                    setSelectedNodeId(undefined);
                  }
                }}
              />

              {selectedNode && (
                <WorkflowStepEditor
                  node={selectedNode}
                  readonly={readonly}
                  onChange={(nextNode) =>
                    updateNodes(
                      draft.definition.nodes.map((node) =>
                        node.id === selectedNode.id ? nextNode : node,
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

            <footer className="workflow-actions">
              {draft.id && !readonly && (
                <button
                  className="btn btn-ghost workflow-delete"
                  disabled={remove.isPending || progress.running}
                  onClick={() => {
                    if (confirm(t("editor.delete_confirm", { name: draft.name }))) {
                      remove.mutate(draft.id!);
                    }
                  }}
                >
                  {remove.isPending ? t("builder.deleting") : t("builder.delete")}
                </button>
              )}

              <div>
                {!draft.definition.nodes.length && <small>{t("builder.save_hint")}</small>}

                <button
                  className="btn btn-primary"
                  disabled={
                    !dirty ||
                    readonly ||
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
            </footer>
          </section>
        </div>
      )}

      {shareNotice && (
        <div className="workflow-share-notice" role="status">
          {shareNotice}
        </div>
      )}

      {createDialogOpen && (
        <WorkflowBuilderDialog
          workflow={null}
          agents={agents.data ?? []}
          onClose={() => setCreateDialogOpen(false)}
          onSaved={() => {
            setCreateDialogOpen(false);
            void workflows.refetch();
          }}
          onDeleted={() => {
            setCreateDialogOpen(false);
            void workflows.refetch();
          }}
        />
      )}

      {shareTarget?.id && (
        <WorkflowShareDialog
          workflow={shareTarget}
          workspaces={workspaces.data ?? []}
          onClose={() => setShareTarget(undefined)}
          onSaved={async () => {
            setShareTarget(undefined);
            setShareNotice(t("share.success", { name: shareTarget.name }));
            await queryClient.invalidateQueries({ queryKey: ["workflows"] });
          }}
        />
      )}
    </main>
  );
}
