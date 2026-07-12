import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

export const queryKeys = {
  session: ["session"] as const,
  platform: ["platform", "public"] as const,
  settings: ["settings"] as const,
  agents: (filters: Record<string, unknown> = {}) => ["agents", filters] as const,
  knowledge: (filters: Record<string, unknown> = {}) => ["knowledge", filters] as const,
  connections: ["connections"] as const,
  memory: (filters: Record<string, unknown> = {}) => ["memory", filters] as const,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (attempt, error) => !(error instanceof ApiError && error.status < 500) && attempt < 2,
    },
    mutations: { retry: false },
  },
});
