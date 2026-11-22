import { create } from 'zustand';
import { ActivityView, CommentView } from './activityView';
import { api } from '../services/api';
import { rememberActivityEdit } from './activityEdits';
import { socialStore } from './social';
import { markActivityRemoved } from './removedActivities';

export interface ActivityStoreState {
  activities: Record<string, ActivityView>;
  feedIds: string[];

  // Batch upsert (e.g. from feed fetch or profile fetch)
  upsertActivities: (items: ActivityView[]) => void;
  // Upsert single activity (e.g. from detail fetch)
  upsertActivity: (item: ActivityView) => void;

  setFeedIds: (ids: string[]) => void;
  appendFeedIds: (ids: string[]) => void;

  // Single Activity field patch
  patchActivity: (id: string, patch: Partial<ActivityView>) => void;

  // Remove activity
  removeActivity: (id: string) => void;

  // Actions
  updateActivityDetails: (
    id: string,
    patch: { title: string; description?: string | null; sportType: any; visibility: any }
  ) => Promise<ActivityView>;

  toggleKudos: (id: string) => Promise<boolean>;

  setCommentsCount: (id: string, count: number) => void;
  addComment: (id: string, comment: CommentView) => void;
  removeComment: (activityId: string, commentId: string) => void;
  updateComment: (activityId: string, commentId: string, content: string, updatedAt?: string | null) => void;
}

export const useActivityStore = create<ActivityStoreState>((set, get) => ({
  activities: {},
  feedIds: [],

  upsertActivities: (items) => {
    set((state) => {
      const next = { ...state.activities };
      for (const item of items) {
        const cur = next[item.id];
        if (!cur) {
          next[item.id] = item;
        } else {
          // Merge: adopt latest values while preserving existing loaded comments & optimistic kudos
          const comments = item.comments?.length ? item.comments : (cur.comments || []);
          next[item.id] = {
            ...item,
            title: item.title || cur.title,
            description: item.description !== undefined ? item.description : cur.description,
            sportType: item.sportType || cur.sportType,
            visibility: item.visibility || cur.visibility,
            hasKudos: item.hasKudos !== null ? item.hasKudos : cur.hasKudos,
            kudosCount: Math.max(cur.kudosCount, item.kudosCount),
            commentsCount: Math.max(cur.commentsCount, item.commentsCount, comments.length),
            comments,
          };
        }
      }
      return { activities: next };
    });
  },

  upsertActivity: (item) => {
    set((state) => {
      const cur = state.activities[item.id];
      const incomingComments = item.comments || [];
      const currentComments = cur?.comments || [];
      const incomingIds = new Set(incomingComments.map((c) => c.id));
      const localUnsynced = currentComments.filter((c) => !incomingIds.has(c.id) && c.id.startsWith('local_'));
      const mergedComments =
        incomingComments.length > 0 || localUnsynced.length > 0
          ? [...incomingComments, ...localUnsynced].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
          : currentComments;

      const merged: ActivityView = cur
        ? {
            ...item,
            title: item.title || cur.title,
            description: item.description !== undefined ? item.description : cur.description,
            sportType: item.sportType || cur.sportType,
            visibility: item.visibility || cur.visibility,
            hasKudos: item.hasKudos !== null ? item.hasKudos : cur.hasKudos,
            kudosCount: Math.max(cur.kudosCount, item.kudosCount),
            commentsCount: Math.max(cur.commentsCount, item.commentsCount, mergedComments.length),
            comments: mergedComments,
          }
        : {
            ...item,
            comments: mergedComments,
          };
      return {
        activities: {
          ...state.activities,
          [item.id]: merged,
        },
      };
    });
  },

  setFeedIds: (ids) => set({ feedIds: ids }),
  appendFeedIds: (ids) =>
    set((state) => {
      const seen = new Set(state.feedIds);
      const unique = ids.filter((id) => !seen.has(id));
      return { feedIds: [...state.feedIds, ...unique] };
    }),

  patchActivity: (id, patch) =>
    set((state) => {
      const cur = state.activities[id];
      if (!cur) return state;
      return {
        activities: {
          ...state.activities,
          [id]: { ...cur, ...patch },
        },
      };
    }),

  removeActivity: (id) => {
    markActivityRemoved(id);
    set((state) => {
      const next = { ...state.activities };
      delete next[id];
      return {
        activities: next,
        feedIds: state.feedIds.filter((fid) => fid !== id),
      };
    });
  },

  updateActivityDetails: async (id, patch) => {
    console.log(`[ACTIVITY_STORE] updateActivityDetails for ${id}:`, patch);
    const before = get().activities[id];

    // 1. Optimistic update in Zustand store
    if (before) {
      set((state) => ({
        activities: {
          ...state.activities,
          [id]: {
            ...before,
            title: patch.title,
            description: patch.description ?? null,
            sportType: patch.sportType,
            visibility: patch.visibility,
          },
        },
      }));
    }

    // Also record in legacy activityEdits for compatibility
    rememberActivityEdit(id, {
      title: patch.title,
      description: patch.description ?? null,
      sportType: patch.sportType,
      visibility: patch.visibility,
    });

    try {
      const res = await api.activities.update(id, patch);
      console.log(`[ACTIVITY_STORE] Server update success for ${id}:`, res);
      const row = res?.activity;
      if (row) {
        set((state) => {
          const cur = state.activities[id];
          if (!cur) return state;
          return {
            activities: {
              ...state.activities,
              [id]: {
                ...cur,
                title: row.title ?? patch.title,
                description: row.description ?? patch.description ?? null,
                sportType: row.sportType ?? patch.sportType,
                visibility: row.visibility ?? patch.visibility,
              },
            },
          };
        });
      }
      return get().activities[id] ?? before;
    } catch (e) {
      console.error(`[ACTIVITY_STORE] Server update failed for ${id}:`, e);
      if (before) {
        set((state) => ({
          activities: {
            ...state.activities,
            [id]: before,
          },
        }));
      }
      throw e;
    }
  },

  toggleKudos: async (id) => {
    const cur = get().activities[id];
    const wasLiked = cur ? cur.hasKudos === true : false;
    const nextGive = !wasLiked;
    const currentCount = cur?.kudosCount ?? 0;
    const optimisticCount = nextGive ? currentCount + 1 : Math.max(0, currentCount - 1);

    console.log(`[ACTIVITY_STORE] toggleKudos for ${id}: nextGive=${nextGive}, count=${optimisticCount}`);

    // 1. Optimistic update
    set((state) => {
      const act = state.activities[id];
      if (!act) return state;
      return {
        activities: {
          ...state.activities,
          [id]: {
            ...act,
            hasKudos: nextGive,
            kudosCount: optimisticCount,
          },
        },
      };
    });

    socialStore.patch(id, { hasKudos: nextGive, kudosCount: optimisticCount });

    try {
      const res = nextGive ? await api.activities.giveKudos(id) : await api.activities.removeKudos(id);
      const serverLiked = res?.hasKudos ?? nextGive;
      const serverCount = Number.isFinite(res?.kudosCount) ? res.kudosCount : optimisticCount;

      console.log(`[ACTIVITY_STORE] toggleKudos success for ${id}: serverLiked=${serverLiked}, count=${serverCount}`);

      set((state) => {
        const act = state.activities[id];
        if (!act) return state;
        return {
          activities: {
            ...state.activities,
            [id]: {
              ...act,
              hasKudos: serverLiked,
              kudosCount: serverCount,
            },
          },
        };
      });

      socialStore.patch(id, { hasKudos: serverLiked, kudosCount: serverCount });
      return serverLiked;
    } catch (e) {
      console.error(`[ACTIVITY_STORE] toggleKudos error for ${id}:`, e);
      set((state) => {
        const act = state.activities[id];
        if (!act) return state;
        return {
          activities: {
            ...state.activities,
            [id]: {
              ...act,
              hasKudos: wasLiked,
              kudosCount: currentCount,
            },
          },
        };
      });
      socialStore.patch(id, { hasKudos: wasLiked, kudosCount: currentCount });
      throw e;
    }
  },

  setCommentsCount: (id, count) => {
    set((state) => {
      const act = state.activities[id];
      if (!act) return state;
      return {
        activities: {
          ...state.activities,
          [id]: { ...act, commentsCount: count },
        },
      };
    });
    socialStore.patch(id, { commentsCount: count });
  },

  addComment: (id, comment) => {
    set((state) => {
      const act = state.activities[id];
      if (!act) return state;
      const seen = new Set((act.comments || []).map((c) => c.id));
      const nextComments = seen.has(comment.id)
        ? act.comments
        : [...(act.comments || []), comment].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
      const newCount = Math.max(act.commentsCount + 1, nextComments.length);
      socialStore.patch(id, { commentsCount: newCount });
      return {
        activities: {
          ...state.activities,
          [id]: {
            ...act,
            commentsCount: newCount,
            comments: nextComments,
          },
        },
      };
    });
  },

  removeComment: (activityId, commentId) => {
    set((state) => {
      const act = state.activities[activityId];
      if (!act) return state;
      const nextComments = (act.comments || []).filter((c) => c.id !== commentId);
      const newCount = Math.max(0, act.commentsCount - 1);
      socialStore.patch(activityId, { commentsCount: newCount });
      return {
        activities: {
          ...state.activities,
          [activityId]: {
            ...act,
            commentsCount: newCount,
            comments: nextComments,
          },
        },
      };
    });
  },

  updateComment: (activityId, commentId, content, updatedAt) => {
    set((state) => {
      const act = state.activities[activityId];
      if (!act) return state;
      return {
        activities: {
          ...state.activities,
          [activityId]: {
            ...act,
            comments: (act.comments || []).map((c) =>
              c.id === commentId ? { ...c, content, updatedAt: updatedAt ?? new Date().toISOString() } : c
            ),
          },
        },
      };
    });
  },
}));

/** Reactive hook to observe a single activity anywhere in the app */
export function useActivity(id: string | undefined): ActivityView | undefined {
  return useActivityStore((s) => (id ? s.activities[id] : undefined));
}

/** Reactive hook to observe the list of activities on Home Feed */
export function useFeedActivities(): ActivityView[] {
  return useActivityStore((s) => {
    const list: ActivityView[] = [];
    for (const id of s.feedIds) {
      const act = s.activities[id];
      if (act) list.push(act);
    }
    return list;
  });
}
