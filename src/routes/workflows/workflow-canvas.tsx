import type { AgentOption, WorkflowNode, WorkflowStageStatus } from "./types";

export function WorkflowCanvas({
  nodes,
  agents,
  onRemove,
  onMove,
  onSelect,
  selectedId,
  stages,
}: {
  nodes: WorkflowNode[];
  agents: AgentOption[];
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onSelect: (id: string) => void;
  selectedId?: string | undefined;
  stages: Record<string, WorkflowStageStatus>;
}) {
  if (!nodes.length) {
    return (
      <div className="workflow-empty">
        <span>◇</span>
        <strong>La orquestación todavía está vacía</strong>
        <p>Selecciona un agente para añadir el primer paso.</p>
      </div>
    );
  }
  return (
    <div className="workflow-canvas">
      {nodes.map((node, index) => {
        const agent = agents.find((item) => item.id === node.agent_id);
        const status = stages[node.id] ?? "pending";
        const statusLabel = {
          pending: "Pendiente",
          running: "Trabajando",
          done: "Completado",
          error: "Error",
        }[status];
        return (
          <div className="workflow-stage-wrap" key={node.id}>
            {index > 0 && (
              <div className="workflow-arrow" aria-hidden="true">
                →
              </div>
            )}
            <article
              className={[
                "workflow-stage",
                selectedId === node.id ? "selected" : "",
                `status-${status}`,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(node.id)}
            >
              <div className="workflow-stage-meta">
                <span className="workflow-stage-number">Paso {index + 1}</span>
                <span className={`workflow-stage-status status-${status}`}>{statusLabel}</span>
              </div>
              <div className="workflow-stage-avatar">
                {(agent?.name || node.label || "A").charAt(0).toUpperCase()}
              </div>
              <strong>{node.label || agent?.name || node.agent_id}</strong>
              <small>
                {agent?.description || (
                  <span className="workflow-agent-warning">Agente no disponible</span>
                )}
              </small>
              {node.instruction && <p className="workflow-stage-instruction">{node.instruction}</p>}
              <div className="workflow-stage-actions">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(node.id, -1);
                  }}
                  aria-label={`Mover ${node.label} a la izquierda`}
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={index === nodes.length - 1}
                  onClick={(event) => {
                    event.stopPropagation();
                    onMove(node.id, 1);
                  }}
                  aria-label={`Mover ${node.label} a la derecha`}
                >
                  →
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(node.id);
                  }}
                  aria-label={`Quitar ${node.label}`}
                >
                  ×
                </button>
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}
