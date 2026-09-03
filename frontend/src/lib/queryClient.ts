import { QueryClient } from '@tanstack/react-query';

/** Shared client so auth logout can clear user-scoped caches. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

/** Drop all cached queries (call on logout / account switch). */
export function clearAuthScopedQueryCache(): void {
  queryClient.clear();
}
