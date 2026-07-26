export interface WorkflowNode {
  id: string;
  agent_id: string;
  label: string;
  instruction?: string;
}

export interface WorkflowEdge {
  source: string;
  target: string;
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

export type WorkflowStageStatus = "pending" | "running" | "done" | "error";

export interface WorkflowProgress {
  stages: Record<string, WorkflowStageStatus>;
  running: boolean;
}

export interface WorkflowRunEvent {
  type: "stage_started" | "stage_done" | "workflow_done" | "error";
  node_id?: string;
  agent_name?: string;
  output?: string;
  message?: string;
}
