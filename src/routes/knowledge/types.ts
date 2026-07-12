export type KnowledgeTab = "skills" | "urls" | "documents" | "memory";
export type ViewMode = "grid" | "list";

export interface Skill {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string | null;
  content?: string;
  body?: string;
  scope?: "private" | "public";
  owner_id?: string;
  labels?: string[];
  created_at?: string;
  updated_at?: string;
  _shared?: boolean;
  _group_id?: string;
  _social_public?: boolean;
  _social_category?: string;
  _social_stars?: number;
  _social_verified?: boolean;
}

export interface KnowledgeItem {
  id: string;
  type: "url" | "document" | "text";
  title: string;
  source: string;
  content?: string;
  char_count?: number;
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
  _shared?: boolean;
  _group_id?: string;
}

export interface MemoryItem {
  filename: string;
  size?: number;
  updated_at?: string | null;
  content?: string;
}

export interface SocialResource {
  resource_id: string;
  is_public?: boolean;
  category?: string;
  stars_count?: number;
  verified?: boolean;
}

export interface SocialResourcesResponse {
  resources: SocialResource[];
}

export interface Workspace {
  id: string;
  name: string;
  type: "personal" | "team";
  role?: string;
  active?: boolean;
}

export interface ResourceGroupsResponse {
  group_ids: string[];
}

export interface KnowledgeData {
  skills: Skill[];
  publicSkills: Skill[];
  urls: KnowledgeItem[];
  documents: KnowledgeItem[];
  memories: MemoryItem[];
  social: SocialResource[];
}

export interface SkillDraft {
  id?: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  content: string;
  labels: string[];
}
