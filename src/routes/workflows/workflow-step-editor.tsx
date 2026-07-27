import { useTranslation } from "react-i18next";
import type { WorkflowNode } from "./types";

export function WorkflowStepEditor({
  node,
  onChange,
  readonly = false,
}: {
  node: WorkflowNode;
  onChange: (node: WorkflowNode) => void;
  readonly?: boolean;
}) {
  const { t } = useTranslation("workflows");
  const evaluator = node.kind === "evaluator";
  return (
    <div className="workflow-step-editor">
      <div>
        <span className="workflow-section-label">{t("step.eyebrow")}</span>

        <strong>{node.label}</strong>

        <p>{t(evaluator ? "step.evaluator_description" : "step.description")}</p>

        <span className="workflow-node-id">
          {t("legacy.text_8f2111c992af")}
          {node.id.slice(0, 8)}
        </span>
      </div>

      {evaluator ? (
        <div className="workflow-evaluator-fields">
          <label>
            {t("loops.condition")}
            <textarea
              className="input"
              rows={3}
              maxLength={2000}
              value={node.evaluator?.condition ?? ""}
              disabled={readonly}
              onChange={(event) =>
                onChange({
                  ...node,
                  evaluator: {
                    condition: event.target.value,
                    max_iterations: node.evaluator?.max_iterations ?? 5,
                  },
                })
              }
            />
          </label>
          <label>
            {t("loops.max_iterations")}
            <input
              className="input"
              type="number"
              min={2}
              max={20}
              value={node.evaluator?.max_iterations ?? 5}
              disabled={readonly}
              onChange={(event) =>
                onChange({
                  ...node,
                  evaluator: {
                    condition: node.evaluator?.condition ?? "",
                    max_iterations: Math.min(20, Math.max(2, Number(event.target.value))),
                  },
                })
              }
            />
          </label>
        </div>
      ) : (
        <label>
          {t("step.instruction")}

          <textarea
            className="input"
            rows={4}
            maxLength={2000}
            value={node.instruction ?? ""}
            disabled={readonly}
            placeholder={t("step.placeholder")}
            onChange={(event) => onChange({ ...node, instruction: event.target.value })}
          />

          <small>{t("step.characters", { count: node.instruction?.length ?? 0 })}</small>
        </label>
      )}
    </div>
  );
}
