import type { Workflow } from "./types";

export function WorkflowSidebar({
  workflows,
  activeId,
  pending,
  error,
  onSelect,
}: {
  workflows: Workflow[];
  activeId?: string | undefined;
  pending: boolean;
  error: boolean;
  onSelect: (workflow: Workflow) => void;
}) {
  return (
    <aside className="workflow-list">
      <div className="workflow-list-header">
        <strong>Mis orquestaciones</strong>
        <span>{workflows.length}</span>
      </div>
      {pending && <p>Cargando orquestaciones…</p>}
      {error && <p className="form-error">No se pudieron cargar.</p>}
      {workflows.map((workflow) => (
        <button
          key={workflow.id}
          className={activeId === workflow.id ? "active" : ""}
          onClick={() => onSelect(workflow)}
        >
          <span>{workflow.name}</span>
          <small>
            {workflow.definition.nodes.length}{" "}
            {workflow.definition.nodes.length === 1 ? "paso" : "pasos"}
          </small>
        </button>
      ))}
      {!pending && !workflows.length && (
        <div className="workflow-list-empty">
          <span>◇</span>
          <p>Aún no tienes orquestaciones guardadas.</p>
        </div>
      )}
    </aside>
  );
}
