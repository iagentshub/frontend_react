import type { WorkflowNode } from "./types";

export function WorkflowStepEditor({
  node,
  onChange,
}: {
  node: WorkflowNode;
  onChange: (instruction: string) => void;
}) {
  return (
    <div className="workflow-step-editor">
      <div>
        <span className="workflow-section-label">Paso seleccionado</span>
        <strong>{node.label}</strong>
        <p>
          Esta instrucción concreta qué debe hacer el agente con la entrada recibida. Déjala vacía
          para usar su comportamiento general.
        </p>
      </div>
      <textarea
        className="input"
        rows={4}
        maxLength={2000}
        value={node.instruction ?? ""}
        placeholder="Ej.: revisa el resultado anterior, identifica riesgos y devuelve una versión corregida."
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
