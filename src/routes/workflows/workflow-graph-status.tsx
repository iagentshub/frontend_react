import { useTranslation } from "react-i18next";
import type { WorkflowGraphAnalysis, WorkflowGraphIssue } from "./workflow-graph";
import type { WorkflowNode } from "./types";

function issueNames(issue: WorkflowGraphIssue, nodes: WorkflowNode[]): string {
  const labels = new Map(nodes.map((node) => [node.id, node.label || node.agent_id]));
  return issue.nodeIds.map((id) => labels.get(id) ?? id).join(", ");
}

export function WorkflowGraphStatus({
  analysis,
  nodes,
}: {
  analysis: WorkflowGraphAnalysis;
  nodes: WorkflowNode[];
}) {
  const { t } = useTranslation("workflows");
  if (analysis.valid) {
    return (
      <div className="workflow-graph-status valid" role="status">
        <strong>{t("graph.ready")}</strong>
        <span>
          {t("graph.summary", {
            branches: analysis.branchCount,
            joins: analysis.joinCount,
          })}
        </span>
      </div>
    );
  }

  return (
    <div className="workflow-graph-status invalid" role="alert">
      <strong>{t("graph.invalid")}</strong>
      <ul>
        {analysis.issues.map((issue) => (
          <li key={`${issue.code}:${issue.nodeIds.join(":")}`}>
            {t(`graph.issues.${issue.code}`, {
              nodes: issueNames(issue, nodes),
            })}
          </li>
        ))}
      </ul>
    </div>
  );
}
