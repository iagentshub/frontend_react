import { queryOptions } from "@tanstack/react-query";
import { api } from "@/api/client";
import { queryKeys } from "@/api/query-client";
import type { PlatformSettings, SessionUser, UserSettings } from "./types";

export const sessionQuery = queryOptions({
  queryKey: queryKeys.session,
  queryFn: ({ signal }) => api.get<SessionUser>("/api/auth/me", signal, false),
  staleTime: 60_000,
  retry: false,
});

export const platformQuery = queryOptions({
  queryKey: queryKeys.platform,
  queryFn: ({ signal }) => api.get<PlatformSettings>("/api/settings/platform/public", signal, false),
  staleTime: 5 * 60_000,
  retry: 1,
});

export const userSettingsQuery = queryOptions({
  queryKey: queryKeys.settings,
  queryFn: ({ signal }) => api.get<UserSettings>("/api/settings", signal),
  staleTime: 60_000,
});
