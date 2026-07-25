import { useTranslation } from "react-i18next";
import type { WorkflowNode } from "./types";

export function WorkflowStepEditor({
  node,
  onChange,
  readonly = false,
}: {
  node: WorkflowNode;
  onChange: (instruction: string) => void;
  readonly?: boolean;
}) {
  const { t } = useTranslation("workflows");
  return (
    <div className="workflow-step-editor">
      <div>
        <span className="workflow-section-label">{t("step.eyebrow")}</span>

        <strong>{node.label}</strong>

        <p>{t("step.description")}</p>

        <span className="workflow-node-id">
          {t("legacy.text_8f2111c992af")}
          {node.id.slice(0, 8)}
        </span>
      </div>

      <label>
        {t("step.instruction")}

        <textarea
          className="input"
          rows={4}
          maxLength={2000}
          value={node.instruction ?? ""}
          disabled={readonly}
          placeholder={t("step.placeholder")}
          onChange={(event) => onChange(event.target.value)}
        />

        <small>{t("step.characters", { count: node.instruction?.length ?? 0 })}</small>
      </label>
    </div>
  );
}
