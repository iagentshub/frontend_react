export interface SessionUser {
  username: string;
  role: "admin" | "user" | "guest";
  email?: string;
  display_name?: string;
  group?: string;
  group_id?: string;
  group_name?: string;
  [key: string]: unknown;
}

export interface PlatformSettings {
  guest_enabled: boolean;
  registration: "open" | "closed" | "invite";
  billing_enabled: boolean;
  landing_enabled?: boolean;
  oauth_google_enabled?: boolean;
  oauth_apple_enabled?: boolean;
  oauth_microsoft_enabled?: boolean;
}

export interface UserSettings {
  theme?: string;
  language?: string;
  [key: string]: unknown;
}
