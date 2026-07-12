export interface AdminStats {
  users_total: number;
  users_active: number;
  users_verified: number;
  connections_total: number;
  tokens_in: number;
  tokens_out: number;
  knowledge_total: number;
  conversations_total: number;
  agents_public: number;
  agents_private: number;
  webmail_url?: string | null;
  tokens_daily?: Array<{ day: string; tokens: number }>;
}

export interface AdminUser {
  username: string;
  email?: string;
  display_name?: string;
  role: string;
  is_active: boolean | number;
  is_verified: boolean | number;
  created_at?: string;
  tokens_in?: number;
  tokens_out?: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  created_by: string;
  created_at?: string;
  status: "active" | "disabled";
  member_count?: number;
  connections_count?: number;
  agents_count?: number;
  knowledge_count?: number;
  tokens_in?: number;
  tokens_out?: number;
}

export interface AdminAgent {
  id: string;
  name?: string;
  agent_type?: string;
  model?: string;
  connection_id?: string | null;
  temperature?: number;
  system_prompt?: string;
  scope?: "public" | "private";
  owner_id?: string;
  owner_email?: string | null;
  tokens_in?: number;
  tokens_out?: number;
  created_at?: string;
}

export interface AdminConnection {
  id: string;
  name?: string;
  type?: string;
  owner_id?: string;
  owner_email?: string;
  tokens_in?: number;
  tokens_out?: number;
  created_at?: string;
}

export interface AdminKnowledge {
  id: string;
  title?: string;
  type?: string;
  owner_id?: string;
  owner_email?: string;
  char_count?: number;
  created_at?: string;
}

export interface PlatformConfig {
  registration: "open" | "closed" | "invite";
  max_users: number;
  max_concurrent_sessions: number;
  email_verify: boolean;
  guest_enabled: boolean;
  landing_enabled: boolean;
  billing_enabled: boolean;
  log_retention_days: number;
}

export interface AdminData {
  stats: AdminStats;
  users: AdminUser[];
  workspaces: AdminWorkspace[];
  agents: AdminAgent[];
  connections: AdminConnection[];
  knowledge: AdminKnowledge[];
  config: PlatformConfig;
}
