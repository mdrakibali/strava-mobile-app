import { useSyncExternalStore } from 'react';
import { api } from '../services/api';

/**
 * Social state shared across screens (feed card ⇄ detail ⇄ kudos list) so a kudos given on the
 * detail screen is visible on the feed without a stale copy.
 *
 * A fetch that started before a like, unlike, or comment change must not paint the old counts
 * back on top of that change. `beginRead` marks when the fetch started; `noteMutation` marks
 * when the server confirmed the change.
 */
export interface SocialState {
  hasKudos: boolean | null;
  kudosCount: number;
  commentsCount: number;
}

const state = new Map<string, SocialState>();
const followState = new Map<string, boolean>();
/** Bumped on every follow/unfollow so an in-flight profile fetch cannot overwrite a newer tap. */
const followEpoch = new Map<string, number>();
/** Bumped on every kudos/comment change so an older response cannot overwrite a newer tap. */
const activityEpoch = new Map<string, number>();
/** Monotonic clock. A read token smaller than an activity's mutation tick is stale. */
let clock = 0;
const mutationTick = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const socialStore = {
  /** Call immediately before a feed, detail, or profile request. Pass the token to `seed`. */
  beginRead() {
    return clock;
  },
  /** Call after a kudos or comment mutation is confirmed by the server. */
  noteMutation(activityId: string) {
    mutationTick.set(activityId, ++clock);
  },
  /** True when this activity changed after `readTick` was taken. */
  isStaleRead(activityId: string, readTick: number) {
    return readTick < (mutationTick.get(activityId) ?? 0);
  },
  /**
   * Server data for these activities. When `readTick` is set, activities that changed after
   * that read started keep the newer counts.
   */
  seed(
    items: { id: string; hasKudos: boolean | null; kudosCount: number; commentsCount: number }[],
    readTick?: number
  ) {
    let changed = false;
    for (const i of items) {
      if (readTick != null && readTick < (mutationTick.get(i.id) ?? 0)) continue;
      const next = { hasKudos: i.hasKudos, kudosCount: i.kudosCount, commentsCount: i.commentsCount };
      const cur = state.get(i.id);
      if (cur && cur.hasKudos === next.hasKudos && cur.kudosCount === next.kudosCount && cur.commentsCount === next.commentsCount) continue;
      state.set(i.id, next);
      changed = true;
    }
    if (changed) emit();
  },
  get: (id: string) => state.get(id),
  patch(id: string, p: Partial<SocialState>) {
    const cur = state.get(id) ?? { hasKudos: null, kudosCount: 0, commentsCount: 0 };
    state.set(id, { ...cur, ...p });
    emit();
  },
  setFollow(athleteId: string, isFollowing: boolean) {
    followState.set(athleteId, isFollowing);
    emit();
  },
  getFollow(athleteId: string) {
    return followState.get(athleteId);
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Live social state for an activity, falling back to the values it was rendered with. */
export const useSocial = (id: string, fallback: SocialState): SocialState => {
  useSyncExternalStore(socialStore.subscribe, () => version);
  return state.get(id) ?? fallback;
};

/** Live follow state for an athlete across all screens. */
export const useFollow = (athleteId: string, initialFollowing: boolean): boolean => {
  useSyncExternalStore(socialStore.subscribe, () => version);
  return followState.get(athleteId) ?? initialFollowing;
};

/**
 * Give or remove kudos. Optimistic, then reconciled with the server's answer; rolls back on error.
 * The endpoints are idempotent (PUT/DELETE), so a double tap or retry can't flip the state.
 */
const finiteCount = (value: unknown, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};

export async function setKudos(activityId: string, give: boolean): Promise<SocialState> {
  const epoch = (activityEpoch.get(activityId) ?? 0) + 1;
  activityEpoch.set(activityId, epoch);
  const before = socialStore.get(activityId) ?? { hasKudos: !give, kudosCount: 0, commentsCount: 0 };
  const wasLiked = before.hasKudos === true;
  let nextCount = before.kudosCount;
  if (give) {
    if (!wasLiked) nextCount += 1;
    nextCount = Math.max(1, nextCount);
  } else if (before.hasKudos !== false) {
    nextCount = Math.max(0, nextCount - 1);
  }
  socialStore.patch(activityId, { hasKudos: give, kudosCount: nextCount });
  socialStore.noteMutation(activityId);

  try {
    const res = give ? await api.activities.giveKudos(activityId) : await api.activities.removeKudos(activityId);
    if (activityEpoch.get(activityId) !== epoch) {
      return socialStore.get(activityId)!;
    }
    const hasKudos = res?.hasKudos === true || res?.hasKudos === false ? res.hasKudos : give;
    let kudosCount = finiteCount(res?.kudosCount, nextCount);
    if (hasKudos && kudosCount < 1) kudosCount = Math.max(1, nextCount);
    socialStore.patch(activityId, { hasKudos, kudosCount });
    socialStore.noteMutation(activityId);
    return socialStore.get(activityId)!;
  } catch (e) {
    if (activityEpoch.get(activityId) === epoch) {
      socialStore.patch(activityId, before);
      socialStore.noteMutation(activityId);
    }
    throw e;
  }
}

/**
 * Change the comment count by exactly one, then replace it with the server's count.
 * An older in-flight add/delete cannot overwrite a newer one, and a feed fetch that started
 * before this change cannot put the old count back.
 */
export async function changeCommentsCount(
  activityId: string,
  delta: number,
  request: () => Promise<number | null | undefined>
): Promise<number> {
  const epoch = (activityEpoch.get(activityId) ?? 0) + 1;
  activityEpoch.set(activityId, epoch);
  const before = socialStore.get(activityId) ?? { hasKudos: null, kudosCount: 0, commentsCount: 0 };
  const optimistic = Math.max(0, before.commentsCount + delta);
  socialStore.patch(activityId, { commentsCount: optimistic });
  socialStore.noteMutation(activityId);
  try {
    const server = await request();
    if (activityEpoch.get(activityId) !== epoch) return socialStore.get(activityId)?.commentsCount ?? optimistic;
    const parsed = Number(server);
    const count = Number.isFinite(parsed) ? Math.max(0, parsed) : optimistic;
    socialStore.patch(activityId, { commentsCount: count });
    socialStore.noteMutation(activityId);
    return count;
  } catch (e) {
    if (activityEpoch.get(activityId) === epoch) socialStore.patch(activityId, before);
    throw e;
  }
}

export function captureFollowEpochs() {
  return new Map(followEpoch);
}

/**
 * Apply a server follow flag from a fetch that started at `snapshot`.
 * A tap that happened while the request was in flight keeps its own result.
 */
export function commitServerFollow(athleteId: string, isFollowing: boolean, snapshot: Map<string, number>) {
  const before = snapshot.get(athleteId) ?? 0;
  const now = followEpoch.get(athleteId) ?? 0;
  if (before !== now) return socialStore.getFollow(athleteId) ?? isFollowing;
  socialStore.setFollow(athleteId, isFollowing);
  return isFollowing;
}

/** Follow/unfollow (idempotent PUT/DELETE); returns the server's resulting state. */
export async function setFollowing(athleteId: string, currentlyFollowing: boolean, wantFollowing: boolean) {
  followEpoch.set(athleteId, (followEpoch.get(athleteId) ?? 0) + 1);
  const epoch = followEpoch.get(athleteId)!;
  socialStore.setFollow(athleteId, wantFollowing);
  try {
    const res = wantFollowing ? await api.athletes.follow(athleteId) : await api.athletes.unfollow(athleteId);
    if (followEpoch.get(athleteId) === epoch) socialStore.setFollow(athleteId, Boolean(res.isFollowing));
    return { isFollowing: Boolean(res.isFollowing), followersCount: res.followersCount, followingCount: res.followingCount };
  } catch (e) {
    if (followEpoch.get(athleteId) === epoch) socialStore.setFollow(athleteId, currentlyFollowing);
    throw e;
  }
}
