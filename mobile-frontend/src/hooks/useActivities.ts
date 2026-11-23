import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityView, fromDetailResponse, fromFeedItem, fromProfileActivity, toAthleteSummary } from '../lib/activityView';
import { api } from '../services/api';

export const activityKeys = {
  all: ['activities'] as const,
  feed: (tab = 'all') => [...activityKeys.all, 'feed', tab] as const,
  detail: (id: string) => [...activityKeys.all, 'detail', id] as const,
  kudos: (id: string) => [...activityKeys.all, 'kudos', id] as const,
  history: (athleteId: string) => [...activityKeys.all, 'history', athleteId] as const,
};

/**
 * 1. Feed Hook: Fetches all feed activities directly without cursor pagination.
 */
export function useFeed(tab: 'all' | 'following' | 'clubs' = 'all') {
  return useQuery({
    queryKey: activityKeys.feed(tab),
    queryFn: async () => {
      const res = await api.feed.getFeed(tab);
      return (res?.feed || []).map(fromFeedItem);
    },
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
 * 3. Kudos List Hook: Fetches all athletes who gave kudos directly without cursor pagination.
 */
export function useKudosList(activityId?: string) {
  return useQuery({
    queryKey: activityKeys.kudos(activityId || ''),
    queryFn: async () => {
      if (!activityId) throw new Error('Activity ID required');
      const res = await api.activities.listKudos(activityId);
      return {
        athletes: res.athletes || [],
        kudosCount: res.kudosCount ?? (res.athletes || []).length,
      };
    },
    enabled: Boolean(activityId),
  });
}

/**
 * 4. Athlete Activity History Hook: Fetches all athlete activities directly without cursor pagination.
 */
export function useAthleteActivities(athleteId?: string) {
  return useQuery({
    queryKey: activityKeys.history(athleteId || ''),
    queryFn: async () => {
      if (!athleteId) throw new Error('Athlete ID required');
      const [profile, page] = await Promise.all([
        api.athletes.getProfile(athleteId),
        api.athletes.listActivities(athleteId),
      ]);
      const athlete = toAthleteSummary(profile.athlete);
      return (page.activities || []).map((r) => fromProfileActivity(r, athlete));
    },
    enabled: Boolean(athleteId),
  });
}

/**
 * 5. Instant Optimistic Kudos Toggle Hook
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

      // 1. Update feed queries (plain arrays)
      queryClient.setQueriesData({ queryKey: ['activities', 'feed'] }, (old?: ActivityView[]) => {
        if (!Array.isArray(old)) return old;
        return old.map(patchItem);
      });

      // 2. Update detail query
      queryClient.setQueryData(activityKeys.detail(activityId), (old: any) => {
        if (!old?.activity) return old;
        return {
          ...old,
          activity: patchItem(old.activity),
        };
      });

      // 3. Update history queries (plain arrays)
      queryClient.setQueriesData({ queryKey: ['activities', 'history'] }, (old?: ActivityView[]) => {
        if (!Array.isArray(old)) return old;
        return old.map(patchItem);
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
 * 6. Update Activity Details
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
 * 7. Delete Activity
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
      queryClient.setQueriesData({ queryKey: ['activities', 'feed'] }, (old?: ActivityView[]) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item) => item.id !== deletedId);
      });

      // Optimistically remove from history
      queryClient.setQueriesData({ queryKey: ['activities', 'history'] }, (old?: ActivityView[]) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item) => item.id !== deletedId);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    },
  });
}

/**
 * 8. Comments Mutations
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
