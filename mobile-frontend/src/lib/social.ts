import { useSyncExternalStore } from 'react';
import { api } from '../services/api';

/**
 * Social state shared across screens (feed card ⇄ detail ⇄ kudos list) so a kudos given on the
 * detail screen is visible on the feed without a stale copy. Server responses always win: every
 * fetch of an activity calls `socialStore.seed`, which replaces local values.
 */
export interface SocialState {
  hasKudos: boolean | null;
  kudosCount: number;
  commentsCount: number;
}

const state = new Map<string, SocialState>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const socialStore = {
  /** Server data for these activities (feed page, detail, history). Overrides local state. */
  seed(items: { id: string; hasKudos: boolean | null; kudosCount: number; commentsCount: number }[]) {
    for (const i of items) state.set(i.id, { hasKudos: i.hasKudos, kudosCount: i.kudosCount, commentsCount: i.commentsCount });
    emit();
  },
  get: (id: string) => state.get(id),
  patch(id: string, p: Partial<SocialState>) {
    const cur = state.get(id) ?? { hasKudos: null, kudosCount: 0, commentsCount: 0 };
    state.set(id, { ...cur, ...p });
    emit();
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

/**
 * Give or remove kudos. Optimistic, then reconciled with the server's answer; rolls back on error.
 * The endpoints are idempotent (PUT/DELETE), so a double tap or retry can't flip the state.
 */
export async function setKudos(activityId: string, give: boolean): Promise<SocialState> {
  const before = socialStore.get(activityId) ?? { hasKudos: !give, kudosCount: 0, commentsCount: 0 };
  const delta = before.hasKudos === give ? 0 : give ? 1 : -1;
  socialStore.patch(activityId, { hasKudos: give, kudosCount: Math.max(0, before.kudosCount + delta) });
  try {
    const res = give ? await api.activities.giveKudos(activityId) : await api.activities.removeKudos(activityId);
    socialStore.patch(activityId, { hasKudos: res.hasKudos, kudosCount: res.kudosCount });
  } catch (e) {
    socialStore.patch(activityId, before);
    throw e;
  }
  return socialStore.get(activityId)!;
}

/** Follow/unfollow (idempotent PUT/DELETE); returns the server's resulting state. */
export async function setFollowing(athleteId: string, _currentlyFollowing: boolean, wantFollowing: boolean) {
  const res = wantFollowing ? await api.athletes.follow(athleteId) : await api.athletes.unfollow(athleteId);
  return { isFollowing: Boolean(res.isFollowing), followersCount: res.followersCount, followingCount: res.followingCount };
}
