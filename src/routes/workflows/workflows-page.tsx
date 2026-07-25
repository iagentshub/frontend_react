import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { WorkflowCanvas } from "./workflow-canvas";
import { WorkflowRunner } from "./workflow-runner";
import { WorkflowCatalog } from "./workflow-sidebar";
import { WorkflowShareDialog } from "./workflow-share-dialog";
import { WorkflowStepEditor } from "./workflow-step-editor";
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
  const [shareTarget, setShareTarget] = useState<Workflow>();
  const [shareNotice, setShareNotice] = useState("");
  const normalizedDraft = useMemo(() => withLinearEdges(draft), [draft]);
  const dirty = fingerprint(draft) !== savedFingerprint;
  const readonly = Boolean(draft._shared);
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
    const fresh = emptyWorkflow(defaultName);
    setDraft(fresh);
    setSavedFingerprint(fingerprint(fresh));
    setSelectedNodeId(undefined);
    setProgress({ stages: {}, running: false });
    setView("editor");
  };

  const selectWorkflow = (workflow: Workflow) => {
    if (!confirmDiscard()) return;
    setDraft(workflow);
    setSavedFingerprint(fingerprint(workflow));
    setSelectedNodeId(workflow.definition.nodes[0]?.id);
    setProgress({ stages: {}, running: false });
    setView("editor");
  };

  const openCatalog = () => {
    if (!confirmDiscard()) return;
    const savedWorkflow = workflows.data?.find((workflow) => workflow.id === draft.id);
    const nextDraft = savedWorkflow ?? emptyWorkflow(defaultName);
    setDraft(nextDraft);
    setSavedFingerprint(fingerprint(nextDraft));
    setSelectedNodeId(undefined);
    setProgress({ stages: {}, running: false });
    setView("catalog");
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
          <button className="btn btn-primary" onClick={createNew}>
            <span aria-hidden="true">＋</span>
            {t("page.new")}
          </button>
        )}
      </header>

      {view === "catalog" ? (
        <WorkflowCatalog
          workflows={workflows.data ?? []}
          pending={workflows.isPending}
          error={workflows.isError}
          onSelect={selectWorkflow}
          onCreate={createNew}
          onShare={setShareTarget}
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
                  {readonly ? t("editor.shared_access") : t("editor.production")}
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
                agents={agents.data ?? []}
                selectedId={selectedNodeId}
                stages={progress.stages}
                readonly={readonly}
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
                  readonly={readonly}
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
