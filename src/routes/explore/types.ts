export type ExploreType = "all" | "agent" | "skill" | "knowledge" | "users";
export type ResourceType = Exclude<ExploreType, "all" | "users">;

export interface ExploreResource {
  resource_type: ResourceType;
  resource_id: string;
  owner: string;
  name: string;
  description?: string;
  category?: string;
  stars_count?: number;
  fork_of_user?: string | null;
  fork_of_id?: string | null;
  linked_to_user?: string | null;
  linked_to_id?: string | null;
  tags?: string[];
  labels?: string[];
  verified?: boolean;
}

export interface ExploreUser {
  username: string;
  avatar_url?: string | null;
  followers_count?: number;
  public_resources_count?: number;
}

export interface PreviewParameter {
  name?: string;
  description?: string;
}

export interface ExplorePreview {
  resource_type: ResourceType;
  resource_id: string;
  name: string;
  description?: string;
  owner?: string;
  category?: string;
  labels?: string[];
  system_prompt?: string;
  skills?: string[];
  knowledge?: string[];
  use_memory?: boolean;
  temperature?: number;
  agent_type?: string;
  body?: string;
  parameters?: Array<PreviewParameter | string>;
  icon?: string;
  content?: string;
  type?: string;
  source?: string;
  char_count?: number;
}

export interface ConnectionOption {
  id: string;
  name?: string;
}

export interface AgentTryResult {
  reply?: string;
  warnings?: string[];
}

export interface SocialActionResult {
  ok: boolean;
  name?: string;
  stars?: number;
}
