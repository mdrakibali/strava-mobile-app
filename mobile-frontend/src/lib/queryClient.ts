import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 0, // Always fetch fresh data on refresh/navigation
      gcTime: 1000 * 60 * 5, // 5 minutes cache
    },
    mutations: {
      retry: 1,
    },
  },
});
