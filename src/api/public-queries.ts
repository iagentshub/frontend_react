import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import { queryKeys } from "./query-client";

export interface PublicSession {
  username: string;
}

export interface PublicPlatformSettings {
  billing_enabled: boolean;
  landing_enabled?: boolean;
}

export const sessionQuery = queryOptions({
  queryKey: queryKeys.session,
  queryFn: ({ signal }) => api.get<PublicSession>("/api/auth/me", signal, false),
  staleTime: 60_000,
  retry: false,
});

export const platformQuery = queryOptions({
  queryKey: queryKeys.platform,
  queryFn: ({ signal }) => {
    if (import.meta.env.DEV && import.meta.env.MODE === "public-preview") {
      return Promise.resolve<PublicPlatformSettings>({
        billing_enabled: true,
        landing_enabled: true,
      });
    }
    return api.get<PublicPlatformSettings>("/api/settings/platform/public", signal, false);
  },
  staleTime: 5 * 60_000,
  retry: 1,
});
