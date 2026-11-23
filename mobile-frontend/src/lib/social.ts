import { useSyncExternalStore } from 'react';
import { api } from '../services/api';

const followState = new Map<string, boolean>();
const followEpoch = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const followStore = {
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

/** Live follow state for an athlete across all screens. */
export const useFollow = (athleteId: string, initialFollowing: boolean): boolean => {
  useSyncExternalStore(followStore.subscribe, () => version);
  return followState.get(athleteId) ?? initialFollowing;
};

export function captureFollowEpochs() {
  return new Map(followEpoch);
}

export function commitServerFollow(
  athleteId: string,
  isFollowing: boolean,
  snapshot: Map<string, number>
) {
  const before = snapshot.get(athleteId) ?? 0;
  const now = followEpoch.get(athleteId) ?? 0;
  if (before !== now) return followStore.getFollow(athleteId) ?? isFollowing;
  followStore.setFollow(athleteId, isFollowing);
  return isFollowing;
}

/** Follow/unfollow (idempotent PUT/DELETE); returns the server's resulting state. */
export async function setFollowing(
  athleteId: string,
  currentlyFollowing: boolean,
  wantFollowing: boolean
) {
  followEpoch.set(athleteId, (followEpoch.get(athleteId) ?? 0) + 1);
  const epoch = followEpoch.get(athleteId)!;
  followStore.setFollow(athleteId, wantFollowing);
  try {
    const res = wantFollowing
      ? await api.athletes.follow(athleteId)
      : await api.athletes.unfollow(athleteId);
    if (followEpoch.get(athleteId) === epoch)
      followStore.setFollow(athleteId, Boolean(res.isFollowing));
    return {
      isFollowing: Boolean(res.isFollowing),
      followersCount: res.followersCount,
      followingCount: res.followingCount,
    };
  } catch (e) {
    if (followEpoch.get(athleteId) === epoch) followStore.setFollow(athleteId, currentlyFollowing);
    throw e;
  }
}
