import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryClient } from "@/api/query-client";
import { WorkflowBuilderDialog } from "./workflow-builder-dialog";
import type { AgentOption, Workflow } from "./types";
import "../../../assets/components/agent-card/agent-card.css";
import "./workflows.css";

const colors = ["#4f46e5", "#0891b2", "#059669", "#d97706", "#7c3aed", "#db2777", "#0f766e"];
function avatarColor(name: string) {
  return colors[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % colors.length];
}

function WorkflowGlyph() {
  return (
    <svg width="21" height="21" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="3" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="3" cy="13" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M4.5 3h2A2.5 2.5 0 0 1 9 5.5v0A2.5 2.5 0 0 0 11.5 8H9A2.5 2.5 0 0 0 6.5 10.5v0A2.5 2.5 0 0 1 4 13H4.5"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
}
function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WorkflowCard({
  workflow,
  onEdit,
  onDelete,
}: {
  workflow: Workflow;
  onEdit: (workflow: Workflow) => void;
  onDelete: (workflow: Workflow) => void;
}) {
  const steps = workflow.definition.nodes.length;
  return (
    <article className="agent-card">
      <div className="agent-card-body">
        <div className="agent-card-top">
          <div className="agent-avatar" style={{ background: avatarColor(workflow.name) }}>
            <WorkflowGlyph />
          </div>
          <div className="agent-card-info">
            <div className="agent-card-name-row">
              <span className="agent-card-name" title={workflow.name}>
                {workflow.name}
              </span>
            </div>
            <div className="agent-card-meta">
              <span className="agent-conn-pill agent-conn-pill--default">
                {steps} {steps === 1 ? "paso" : "pasos"}
              </span>
            </div>
          </div>
        </div>
        <p className="agent-card-desc">{workflow.description || "Sin descripción"}</p>
      </div>
      <div className="agent-card-footer">
        <button className="agent-action-chat" onClick={() => onEdit(workflow)}>
          <WorkflowGlyph /> Editar
        </button>
        <div className="agent-card-actions-right">
          <button
            className="btn-icon btn-icon--danger"
            title="Eliminar"
            aria-label="Eliminar"
            onClick={() => onDelete(workflow)}
          >
            <DeleteIcon />
          </button>
        </div>
      </div>
    </article>
  );
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
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/api/workflows/${encodeURIComponent(id)}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
  });
  const [editor, setEditor] = useState<Workflow | null | undefined>(undefined);

  const confirmDelete = (workflow: Workflow) => {
    if (confirm(`¿Eliminar «${workflow.name}» definitivamente?`)) remove.mutate(workflow.id!);
  };

  return (
    <main className="page-content workflows-page">
      <header className="workflows-header">
        <div>
          <span className="workflow-eyebrow">Automatización multiagente</span>
          <h1>Orquestación</h1>
          <p>Convierte varios agentes en un proceso ordenado, comprobable y reutilizable.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditor(null)}>
          <span aria-hidden="true">＋</span> Nueva orquesta
        </button>
      </header>

      {remove.isError && (
        <div className="form-error" role="alert">
          No se pudo eliminar la orquestación.
        </div>
      )}

      {workflows.isPending ? (
        <div className="empty-state">Cargando orquestaciones…</div>
      ) : workflows.isError ? (
        <div className="empty-state">
          <p>No se pudieron cargar las orquestaciones.</p>
          <button className="btn btn-primary" onClick={() => void workflows.refetch()}>
            Reintentar
          </button>
        </div>
      ) : workflows.data?.length ? (
        <div className="agents-grid">
          {workflows.data.map((workflow) => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onEdit={setEditor}
              onDelete={confirmDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <WorkflowGlyph />
          <p>Todavía no tienes orquestaciones.</p>
        </div>
      )}

      {editor !== undefined && (
        <WorkflowBuilderDialog
          workflow={editor}
          agents={agents.data ?? []}
          onClose={() => setEditor(undefined)}
          onSaved={() => {
            setEditor(undefined);
            void workflows.refetch();
          }}
          onDeleted={() => {
            setEditor(undefined);
            void workflows.refetch();
          }}
        />
      )}
    </main>
  );
}
