export type ConnectionCategory = "llm" | "machine" | "database";

export type ProviderFieldType = "text" | "password" | "number" | "select" | "textarea" | "checkbox";

export interface ProviderOption {
  value: string;
  label: string;
}

export interface ProviderField {
  key: string;
  label: string;
  type: ProviderFieldType;
  placeholder?: string;
  required?: boolean;
  default?: string;
  options?: ProviderOption[];
  depends_on?: string | null;
  depends_value?: string | null;
}

export interface ConnectionProvider {
  type: string;
  label: string;
  icon?: string;
  category?: ConnectionCategory;
  fields?: ProviderField[];
}

export interface Connection {
  id: string;
  name: string;
  type: string;
  model?: string;
  host?: string;
  url?: string;
  labels?: string[];
  tokens_in?: number;
  tokens_out?: number;
  owner_id?: string;
  _shared?: boolean;
  _personal_key?: boolean;
  _group_id?: string;
  [key: string]: unknown;
}

export interface ConnectionTestResult {
  id: string;
  ok: boolean;
  message?: string;
  detail?: string;
  latency_ms?: number | null;
}

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  role?: "owner" | "admin" | "member";
  active?: boolean;
}

export interface ConnectionStatus {
  state: "idle" | "testing" | "ok" | "error";
  message?: string;
  detail?: string;
}

export type DynamicFieldValue = string | boolean;
