import { useTranslation } from "react-i18next";
import type { AgentOption, WorkflowNode, WorkflowStageStatus } from "./types";

export function WorkflowCanvas({
  nodes,
  agents,
  onRemove,
  onMove,
  onSelect,
  selectedId,
  stages,
  readonly = false,
}: {
  nodes: WorkflowNode[];
  agents: AgentOption[];
  onRemove: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onSelect: (id: string) => void;
  selectedId?: string | undefined;
  stages: Record<string, WorkflowStageStatus>;
  readonly?: boolean;
}) {
  const { t } = useTranslation("workflows");
  if (!nodes.length) {
    return (
      <div className="workflow-empty">
        <span>⌁</span>

        <strong>{t("canvas.empty_title")}</strong>

        <p>{t("canvas.empty_description")}</p>

        <small>{t("canvas.empty_flow")}</small>
      </div>
    );
  }
  return (
    <div className="workflow-canvas" aria-label={t("canvas.aria")}>
      <div className="workflow-endpoint">
        <span>{t("legacy.text_6fca55ca3c82")}</span>

        <strong>{t("canvas.input")}</strong>
      </div>

      {nodes.map((node, index) => {
        const agent = agents.find((item) => item.id === node.agent_id);
        const status = stages[node.id] ?? "pending";
        const statusLabel = t(`canvas.status.${status}`);
        return (
          <div className="workflow-stage-wrap" key={node.id}>
            <div className="workflow-arrow" aria-hidden="true">
              <i />→
            </div>

            <article
              className={[
                "workflow-stage",
                selectedId === node.id ? "selected" : "",
                `status-${status}`,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(node.id)}
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === node.id}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(node.id);
                }
              }}
            >
              <div className="workflow-stage-meta">
                <span className="workflow-stage-number">
                  {t("canvas.step", { number: index + 1 })}
                </span>

                <span className={`workflow-stage-status status-${status}`}>{statusLabel}</span>
              </div>

              <div className="workflow-stage-avatar">
                {(agent?.name || node.label || "A").charAt(0).toUpperCase()}
              </div>

              <strong>{node.label || agent?.name || node.agent_id}</strong>

              <span className="workflow-stage-type">{t("canvas.specialized")}</span>

              <small>
                {agent?.description || (
                  <span className="workflow-agent-warning">{t("canvas.unavailable")}</span>
                )}
              </small>

              {node.instruction && <p className="workflow-stage-instruction">{node.instruction}</p>}

              <div className="workflow-stage-actions">
                {!readonly && (
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(node.id, -1);
                    }}
                    aria-label={t("canvas.move_left", { name: node.label })}
                  >
                    ←
                  </button>
                )}

                {!readonly && (
                  <button
                    type="button"
                    disabled={index === nodes.length - 1}
                    onClick={(event) => {
                      event.stopPropagation();
                      onMove(node.id, 1);
                    }}
                    aria-label={t("canvas.move_right", { name: node.label })}
                  >
                    →
                  </button>
                )}

                {!readonly && (
                  <button
                    type="button"
                    className="danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemove(node.id);
                    }}
                    aria-label={t("canvas.remove", { name: node.label })}
                  >
                    ×
                  </button>
                )}
              </div>
            </article>
          </div>
        );
      })}

      <div className="workflow-arrow" aria-hidden="true">
        <i />→
      </div>

      <div className="workflow-endpoint output">
        <span>{t("legacy.text_5d84eb9e92dc")}</span>

        <strong>{t("canvas.output")}</strong>
      </div>
    </div>
  );
}
