import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityView, CommentView, fromDetailResponse, fromFeedItem } from '../lib/activityView';
import { api } from '../services/api';

export const activityKeys = {
  all: ['activities'] as const,
  feed: (tab = 'all') => [...activityKeys.all, 'feed', tab] as const,
  detail: (id: string) => [...activityKeys.all, 'detail', id] as const,
  kudos: (id: string) => [...activityKeys.all, 'kudos', id] as const,
  history: (athleteId: string) => [...activityKeys.all, 'history', athleteId] as const,
};

/**
 * 1. Feed Hook: Supports cursor pagination, caching, and pull-to-refresh
 */
export function useFeed(tab: 'all' | 'following' | 'clubs' = 'all') {
  return useInfiniteQuery({
    queryKey: activityKeys.feed(tab),
    queryFn: async ({ pageParam }) => {
      const res = await api.feed.getFeed(tab, pageParam ?? undefined, 20);
      return {
        items: (res?.feed || []).map(fromFeedItem),
        count: res.count,
        nextCursor: res.nextCursor,
        hasNextPage: res.hasNextPage,
      };
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => (lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : null),
  });
}

/**
 * 2. Activity Detail Hook
 */
export function useActivityDetail(id?: string) {
  return useQuery({
    queryKey: activityKeys.detail(id || ''),
    queryFn: async () => {
      if (!id) throw new Error('Activity ID required');
      const res = await api.activities.get(id);
      return {
        activity: fromDetailResponse(res),
        isOwner: Boolean(res.isOwner),
      };
    },
    enabled: Boolean(id),
  });
}

/**
 * 3. Instant Optimistic Kudos Toggle Hook
 */
export function useToggleKudos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, give }: { activityId: string; give: boolean }) => {
      return give ? api.activities.giveKudos(activityId) : api.activities.removeKudos(activityId);
    },
    onMutate: async ({ activityId, give }) => {
      await queryClient.cancelQueries({ queryKey: activityKeys.all });

      const previousQueries = queryClient.getQueriesData({ queryKey: activityKeys.all });

      const patchItem = (item: ActivityView): ActivityView => {
        if (item.id !== activityId) return item;
        const currentCount = item.kudosCount ?? 0;
        return {
          ...item,
          hasKudos: give,
          kudosCount: give ? currentCount + 1 : Math.max(0, currentCount - 1),
        };
      };

      // Update feed queries
      queryClient.setQueriesData({ queryKey: ['activities', 'feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: (page.items || []).map(patchItem),
          })),
        };
      });

      // Update detail query
      queryClient.setQueryData(activityKeys.detail(activityId), (old: any) => {
        if (!old?.activity) return old;
        return {
          ...old,
          activity: patchItem(old.activity),
        };
      });

      // Update history queries
      queryClient.setQueriesData({ queryKey: ['activities', 'history'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: (page.items || []).map(patchItem),
          })),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: (_data, _err, { activityId }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.kudos(activityId) });
    },
  });
}

/**
 * 4. Update Activity Details
 */
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { title: string; description?: string | null; sportType: any; visibility: any };
    }) => {
      const res = await api.activities.update(id, patch);
      return res?.activity;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: activityKeys.feed() });
      queryClient.invalidateQueries({ queryKey: ['activities', 'history'] });
    },
  });
}

/**
 * 5. Delete Activity
 */
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.activities.remove(id);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: activityKeys.all });

      // Optimistically remove from feed
      queryClient.setQueriesData({ queryKey: ['activities', 'feed'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: (page.items || []).filter((item: ActivityView) => item.id !== deletedId),
          })),
        };
      });

      // Optimistically remove from history
      queryClient.setQueriesData({ queryKey: ['activities', 'history'] }, (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            items: (page.items || []).filter((item: ActivityView) => item.id !== deletedId),
          })),
        };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

/**
 * 6. Comments Mutations
 */
export function useAddComment(activityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, parentCommentId }: { content: string; parentCommentId?: string }) => {
      return api.activities.addComment(activityId, content, parentCommentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.feed() });
    },
  });
}

export function useDeleteComment(activityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      return api.activities.deleteComment(activityId, commentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
      queryClient.invalidateQueries({ queryKey: activityKeys.feed() });
    },
  });
}

export function useEditComment(activityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      return api.activities.editComment(activityId, commentId, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.detail(activityId) });
    },
  });
}
