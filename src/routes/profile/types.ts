export interface ProfileSession {
  username: string;
  role: "admin" | "gestor" | "standard" | "user" | "guest";
  auth_method?: string;
  workspace_id?: string;
  workspace_name?: string;
}

export interface SocialProfile {
  username: string;
  avatar_url?: string | null;
  bio?: string | null;
  languages?: string[];
  email_public?: string | null;
  github?: string | null;
  cv?: string | null;
}

export interface ProfileSettings {
  theme?: string;
  language?: string;
}

export interface ProfilePlatform {
  billing_enabled?: boolean;
}

export interface ProfileWorkspace {
  id: string;
  name: string;
  type: "personal" | "team";
  role: "owner" | "admin" | "member";
  status?: "active" | "disabled";
  active?: boolean;
  created_by?: string;
}

export interface ProfileInvitation {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  username: string;
  invited_by: string;
  created_at?: string;
}

export interface ProfileConnection {
  id: string;
  name?: string;
  type?: string;
  label?: string;
  tokens_in?: number;
  tokens_out?: number;
}

export interface DeletionStatus {
  scheduled: boolean;
  deletion_date?: string | null;
}

export interface BillingState {
  tier: string;
  seats?: number;
  status?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  interval?: "month" | "year";
}

export interface LicenseUser {
  username: string;
  email?: string;
  licensed: boolean;
}

export interface LicenseState {
  owner: string;
  used: number;
  seats: number;
  available: number;
  users: LicenseUser[];
}

export interface ProfileData {
  session: ProfileSession;
  social: SocialProfile;
  settings: ProfileSettings;
  platform: ProfilePlatform;
  workspaces: ProfileWorkspace[];
  invitations: ProfileInvitation[];
  connections: ProfileConnection[];
  deletion: DeletionStatus;
  billing: BillingState | null;
}
