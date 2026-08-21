import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";
import { queryKeys } from "./query-client";

export interface PublicPlatformSettings {
  billing_enabled: boolean;
  landing_enabled?: boolean;
}

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
