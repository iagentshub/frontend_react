export interface WorkflowPosition {
  x: number;
  y: number;
}

export interface WorkflowEvaluatorConfig {
  condition: string;
  max_iterations: number;
}

export interface WorkflowNode {
  id: string;
  agent_id: string;
  label: string;
  instruction?: string;
  kind?: "agent" | "evaluator";
  position?: WorkflowPosition;
  evaluator?: WorkflowEvaluatorConfig;
}

export interface WorkflowEdge {
  source: string;
  target: string;
  type?: "sequence" | "loop";
  mode?: "fixed" | "condition";
  iterations?: number;
}

export interface Workflow {
  id?: string;
  name: string;
  description: string;
  definition: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  labels?: string[];
  updated_at?: string;
  owner_id?: string;
  origin_type?: string;
  _shared?: boolean;
  _group_id?: string;
  _group_ids?: string[];
}

export interface WorkflowWorkspace {
  id: string;
  name: string;
  type?: string;
}

export interface AgentOption {
  id: string;
  name: string;
  description?: string;
}

export type WorkflowStageStatus = "pending" | "running" | "evaluating" | "done" | "error";

export interface WorkflowProgress {
  stages: Record<string, WorkflowStageStatus>;
  running: boolean;
  evaluations?: Record<string, WorkflowEvaluation>;
}

export interface WorkflowEvaluation {
  approved: boolean;
  reason: string;
  iteration: number;
}

export interface WorkflowRunEvent {
  type:
    | "stage_started"
    | "stage_done"
    | "evaluation_started"
    | "evaluation_done"
    | "loop_iteration_started"
    | "loop_limit_reached"
    | "workflow_done"
    | "error";
  node_id?: string;
  target_node_id?: string;
  agent_name?: string;
  output?: string;
  message?: string;
  iteration?: number;
  approved?: boolean;
  reason?: string;
}
