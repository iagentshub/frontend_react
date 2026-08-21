import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./client";

export const queryKeys = {
  platform: ["platform", "public"] as const,
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
