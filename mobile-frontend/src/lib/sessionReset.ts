import { queryClient } from './queryClient';

/**
 * Dropped whenever the session changes (logout or switch account).
 * Clears TanStack Query cache so another account doesn't see stale queries.
 */
export function resetSessionOverlays() {
  queryClient.clear();
}
