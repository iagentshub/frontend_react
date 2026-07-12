export interface Agent {
  id: string;
  name?: string;
  model?: string;
  connection_id?: string;
  tokens_in?: number;
  tokens_out?: number;
}

export interface Connection {
  id: string;
  name?: string;
  type?: string;
  scope?: string;
  _personal_key?: boolean;
  tokens_in?: number;
  tokens_out?: number;
}

export interface TokenDay {
  day?: string;
  date?: string;
  tokens?: number;
}

export interface DashboardData {
  agents: Agent[];
  connections: Connection[];
  skills: unknown[];
  memories: unknown[];
  knowledge: unknown[];
  tokenDaily: TokenDay[];
}

export type WidgetId =
  "summary" | "token-usage" | "conn-status" | "recent" | "activity" | "composition" | "feed";
export type WidgetSize = "small" | "medium" | "large";
export type SummaryItem = "agents" | "connections" | "skills" | "memory" | "knowledge";
export type FeedResourceType = "agent" | "skill" | "knowledge";

export interface WidgetConfig {
  size?: WidgetSize;
  pageSize?: number;
  days?: number;
  limit?: number;
  groupBy?: "connection" | "agent";
  scope?: "all" | "personal";
  vizType?: "bars" | "donut";
  items?: SummaryItem[];
  types?: FeedResourceType[];
  density?: "normal" | "compact";
}

export type DashboardConfig = Partial<Record<WidgetId, WidgetConfig>>;
export interface ConnectionTest {
  id: string;
  ok: boolean;
  message?: string;
  detail?: string;
}

export interface FeedItem {
  resource_type: FeedResourceType;
  resource_id: string;
  name?: string;
  description?: string;
  owner?: string;
  updated_at?: string;
  stars_count?: number;
  starred?: boolean;
}
