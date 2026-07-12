export interface SessionUser {
  username: string;
  role: "admin" | "user" | "guest";
  email?: string;
  display_name?: string;
  workspace?: string;
  [key: string]: unknown;
}

export interface PlatformSettings {
  guest_enabled: boolean;
  registration: "open" | "closed" | "invite";
  billing_enabled: boolean;
  landing_enabled?: boolean;
}

export interface UserSettings {
  theme?: string;
  language?: string;
  [key: string]: unknown;
}
