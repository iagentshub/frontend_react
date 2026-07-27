import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { streamEvents } from "@/api/client";
import type { WorkflowProgress, WorkflowRunEvent, WorkflowStageStatus } from "./types";

interface RunEntry {
  id: string;
  kind: "stage" | "evaluation";
  nodeId: string;
  agentName: string;
  output: string;
  iteration: number;
  approved?: boolean;
}

export function WorkflowRunner({
  workflowId,
  disabledReason,
  onProgress,
}: {
  workflowId: string;
  disabledReason?: string | undefined;
  onProgress: (progress: WorkflowProgress) => void;
}) {
  const { t } = useTranslation("workflows");
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<RunEntry[]>([]);
  const [finalOutput, setFinalOutput] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async () => {
    if (!input.trim() || running || disabledReason) return;
    const abortController = new AbortController();
    controller.current = abortController;
    setRunning(true);
    setEntries([]);
    setFinalOutput("");
    setError("");
    onProgress({ stages: {}, running: true });
    let activeNodeId = "";
    const completed: Record<string, WorkflowStageStatus> = {};
    const evaluations: NonNullable<WorkflowProgress["evaluations"]> = {};
    try {
      for await (const item of streamEvents<WorkflowRunEvent>(
        `/api/workflows/${encodeURIComponent(workflowId)}/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input }),
          signal: abortController.signal,
        },
      )) {
        const event = item.data;
        if (event.type === "error") {
          throw new Error(event.message || t("runner.run_error"));
        }
        if (event.type === "stage_started" && event.node_id) {
          activeNodeId = event.node_id;
          onProgress({
            running: true,
            stages: { ...completed, [event.node_id]: "running" },
            evaluations: { ...evaluations },
          });
        } else if (event.type === "stage_done" && event.node_id) {
          completed[event.node_id] = "done";
          setEntries((current) => [
            ...current,
            {
              id: `${event.node_id}:${event.iteration ?? 1}:${current.length}`,
              kind: "stage",
              nodeId: event.node_id!,
              agentName: event.agent_name || t("runner.agent"),
              output: event.output || "",
              iteration: event.iteration ?? 1,
            },
          ]);
          onProgress({
            running: true,
            stages: { ...completed },
            evaluations: { ...evaluations },
          });
        } else if (event.type === "evaluation_started" && event.node_id) {
          activeNodeId = event.node_id;
          onProgress({
            running: true,
            stages: { ...completed, [event.node_id]: "evaluating" },
            evaluations: { ...evaluations },
          });
        } else if (event.type === "evaluation_done" && event.node_id) {
          completed[event.node_id] = "done";
          evaluations[event.node_id] = {
            approved: Boolean(event.approved),
            reason: event.reason || "",
            iteration: event.iteration ?? 1,
          };
          setEntries((current) => [
            ...current,
            {
              id: `${event.node_id}:${event.iteration ?? 1}:${current.length}`,
              kind: "evaluation",
              nodeId: event.node_id!,
              agentName: event.agent_name || t("runner.agent"),
              output: event.reason || "",
              iteration: event.iteration ?? 1,
              approved: Boolean(event.approved),
            },
          ]);
          onProgress({
            running: true,
            stages: { ...completed },
            evaluations: { ...evaluations },
          });
        } else if (event.type === "workflow_done") {
          setFinalOutput(event.output || "");
        }
      }
    } catch (caught) {
      if (abortController.signal.aborted) {
        setError(t("runner.cancelled"));
      } else {
        setError(caught instanceof Error ? caught.message : t("runner.unexpected_error"));
        if (activeNodeId) completed[activeNodeId] = "error";
      }
    } finally {
      controller.current = null;
      setRunning(false);
      onProgress({
        running: false,
        stages: { ...completed },
        evaluations: { ...evaluations },
      });
    }
  };

  const cancel = () => controller.current?.abort();

  return (
    <section className="workflow-runner">
      <header>
        <div>
          <span className="workflow-section-label">{t("runner.eyebrow")}</span>

          <h2>{t("runner.title")}</h2>

          <p>{t("runner.description")}</p>
        </div>

        {running && <span className="workflow-live-badge">{t("runner.running")}</span>}
      </header>

      <div className="workflow-run-controls">
        <textarea
          className="input"
          rows={4}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("runner.placeholder")}
          disabled={running}
        />

        <div>
          {running ? (
            <button className="btn btn-ghost" onClick={cancel}>
              {t("runner.cancel")}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!input.trim() || Boolean(disabledReason)}
              onClick={() => void run()}
            >
              {t("runner.run")}
            </button>
          )}

          {disabledReason && <small>{disabledReason}</small>}
        </div>
      </div>

      {(entries.length > 0 || finalOutput || error) && (
        <div className="workflow-run-results" aria-live="polite">
          {entries.map((entry, index) => (
            <details key={entry.id} open={index === entries.length - 1 && !finalOutput}>
              <summary>
                <span>{entry.kind === "evaluation" ? "E" : index + 1}</span>

                {entry.agentName}

                <small>
                  {entry.kind === "evaluation"
                    ? `${t("runner.iteration", { count: entry.iteration })} · ${t(
                        entry.approved ? "runner.approved" : "runner.rejected",
                      )}`
                    : t("runner.completed")}
                </small>
              </summary>

              <pre>{entry.output}</pre>
            </details>
          ))}

          {finalOutput && (
            <section className="workflow-final-output">
              <strong>{t("runner.final_result")}</strong>

              <pre>{finalOutput}</pre>
            </section>
          )}

          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
