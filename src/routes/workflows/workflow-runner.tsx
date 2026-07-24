import { useEffect, useRef, useState } from "react";
import { streamEvents } from "@/api/client";
import type { WorkflowProgress, WorkflowRunEvent, WorkflowStageStatus } from "./types";

interface RunEntry {
  nodeId: string;
  agentName: string;
  output: string;
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
          throw new Error(event.message || "No se pudo ejecutar la orquestación");
        }
        if (event.type === "stage_started" && event.node_id) {
          activeNodeId = event.node_id;
          onProgress({
            running: true,
            stages: { ...completed, [event.node_id]: "running" },
          });
        } else if (event.type === "stage_done" && event.node_id) {
          completed[event.node_id] = "done";
          setEntries((current) => [
            ...current,
            {
              nodeId: event.node_id!,
              agentName: event.agent_name || "Agente",
              output: event.output || "",
            },
          ]);
          onProgress({ running: true, stages: { ...completed } });
        } else if (event.type === "workflow_done") {
          setFinalOutput(event.output || "");
        }
      }
    } catch (caught) {
      if (abortController.signal.aborted) {
        setError("Ejecución cancelada");
      } else {
        setError(caught instanceof Error ? caught.message : "Error inesperado");
        if (activeNodeId) completed[activeNodeId] = "error";
      }
    } finally {
      controller.current = null;
      setRunning(false);
      onProgress({ running: false, stages: { ...completed } });
    }
  };

  const cancel = () => controller.current?.abort();

  return (
    <section className="workflow-runner">
      <header>
        <div>
          <span className="workflow-section-label">Prueba controlada</span>
          <h2>Ejecutar orquestación</h2>
          <p>La salida de cada paso se convierte en la entrada del siguiente.</p>
        </div>
        {running && <span className="workflow-live-badge">En ejecución</span>}
      </header>

      <div className="workflow-run-controls">
        <textarea
          className="input"
          rows={4}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Describe la tarea que iniciará la orquestación…"
          disabled={running}
        />
        <div>
          {running ? (
            <button className="btn btn-ghost" onClick={cancel}>
              Cancelar
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!input.trim() || Boolean(disabledReason)}
              onClick={() => void run()}
            >
              Ejecutar orquestación
            </button>
          )}
          {disabledReason && <small>{disabledReason}</small>}
        </div>
      </div>

      {(entries.length > 0 || finalOutput || error) && (
        <div className="workflow-run-results" aria-live="polite">
          {entries.map((entry, index) => (
            <details key={entry.nodeId} open={index === entries.length - 1 && !finalOutput}>
              <summary>
                <span>{index + 1}</span>
                {entry.agentName}
                <small>Completado</small>
              </summary>
              <pre>{entry.output}</pre>
            </details>
          ))}
          {finalOutput && (
            <section className="workflow-final-output">
              <strong>Resultado final</strong>
              <pre>{finalOutput}</pre>
            </section>
          )}
          {error && <p className="form-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
