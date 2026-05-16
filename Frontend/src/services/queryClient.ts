import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Expose for E2E test debugging
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__REACT_QUERY_CLIENT__ = queryClient;
}
