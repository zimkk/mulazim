import { QueryClient } from '@tanstack/react-query'

/** Treat a transient PostgREST clock-skew rejection as retryable. */
function isTransient(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '')
  return /issued at future|JWT|PGRST303|Failed to fetch|NetworkError|timeout/i.test(msg)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (count, error) => (isTransient(error) ? count < 4 : count < 1),
      retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (count, error) => isTransient(error) && count < 3,
      retryDelay: (attempt) => Math.min(400 * 2 ** attempt, 3000),
    },
  },
})
