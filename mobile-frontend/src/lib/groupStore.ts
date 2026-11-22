import { useSyncExternalStore } from 'react';
import { api } from '../services/api';

export interface ClubState {
  id: string;
  name?: string;
  sportType?: string;
  city?: string | null;
  description?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  memberCount: number;
  isMember: boolean;
  userRole?: string | null;
  isPrivate?: boolean;
}

export interface ChallengeState {
  id: string;
  title?: string;
  description?: string | null;
  sportType?: string;
  targetMeters?: number;
  currentMeters?: number;
  daysRemaining?: number;
  participantsCount?: number;
  isJoined: boolean;
  isCompleted?: boolean;
  creatorId?: string | null;
  badgeUrl?: string | null;
}

export interface EventState {
  id: string;
  title?: string;
  sportType?: string;
  eventDate?: string;
  meetingPoint?: string;
  paceDescription?: string | null;
  distanceMeters?: number | null;
  attendeesCount: number;
  rsvpStatus: 'GOING' | 'MAYBE' | 'DECLINED' | null;
  clubName?: string | null;
  creator?: any;
}

const clubs = new Map<string, ClubState>();
const challenges = new Map<string, ChallengeState>();
const events = new Map<string, EventState>();
const removed = new Set<string>();

const clubEpoch = new Map<string, number>();
const challengeEpoch = new Map<string, number>();
const eventEpoch = new Map<string, number>();

let clock = 0;
const mutationTick = new Map<string, number>();
const listeners = new Set<() => void>();
let version = 0;

const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

const finiteNumber = (val: unknown, fallback: number) => {
  const n = Number(val);
  return Number.isFinite(n) ? Math.max(0, n) : fallback;
};

export const groupStore = {
  beginRead() {
    return clock;
  },
  noteMutation(id: string) {
    mutationTick.set(id, ++clock);
  },
  isStaleRead(id: string, readTick: number) {
    return readTick < (mutationTick.get(id) ?? 0);
  },
  remove(id: string) {
    removed.add(id);
    clubs.delete(id);
    challenges.delete(id);
    events.delete(id);
    groupStore.noteMutation(id);
    emit();
  },
  isRemoved(id: string) {
    return removed.has(id);
  },
  unremove(id: string) {
    removed.delete(id);
    emit();
  },

  // Clubs
  seedClubs(items: any[], readTick?: number) {
    let changed = false;
    for (const c of items) {
      if (!c?.id || removed.has(c.id)) continue;
      if (readTick != null && readTick < (mutationTick.get(c.id) ?? 0)) continue;
      const cur = clubs.get(c.id);
      const next: ClubState = {
        id: c.id,
        name: c.name ?? cur?.name,
        sportType: c.sportType ?? cur?.sportType,
        city: c.city !== undefined ? c.city : cur?.city ?? null,
        description: c.description !== undefined ? c.description : cur?.description ?? null,
        avatarUrl: c.avatarUrl !== undefined ? c.avatarUrl : cur?.avatarUrl ?? null,
        bannerUrl: c.bannerUrl !== undefined ? c.bannerUrl : cur?.bannerUrl ?? null,
        memberCount: finiteNumber(c.memberCount ?? c.membersCount, cur?.memberCount ?? 0),
        isMember: c.isMember !== undefined ? Boolean(c.isMember) : (cur?.isMember ?? false),
        userRole: c.userRole !== undefined ? c.userRole : cur?.userRole ?? null,
        isPrivate: c.isPrivate !== undefined ? Boolean(c.isPrivate) : (cur?.isPrivate ?? false),
      };
      if (
        cur &&
        cur.isMember === next.isMember &&
        cur.memberCount === next.memberCount &&
        cur.name === next.name &&
        cur.description === next.description
      ) {
        continue;
      }
      clubs.set(c.id, next);
      changed = true;
    }
    if (changed) emit();
  },
  getClub(id: string): ClubState | undefined {
    return clubs.get(id);
  },
  patchClub(id: string, patch: Partial<ClubState>) {
    const cur = clubs.get(id);
    if (!cur) {
      clubs.set(id, {
        id,
        memberCount: 0,
        isMember: false,
        ...patch,
      });
    } else {
      clubs.set(id, { ...cur, ...patch });
    }
    emit();
  },
  async joinClub(id: string, want: boolean, fallback?: Partial<ClubState>): Promise<ClubState> {
    const epoch = (clubEpoch.get(id) ?? 0) + 1;
    clubEpoch.set(id, epoch);
    const before = clubs.get(id) ?? {
      id,
      memberCount: fallback?.memberCount ?? 0,
      isMember: fallback?.isMember ?? !want,
      ...fallback,
    };
    const wasMember = before.isMember === true;
    let nextCount = before.memberCount;
    if (want) {
      if (!wasMember) nextCount += 1;
      nextCount = Math.max(1, nextCount);
    } else {
      if (wasMember) nextCount = Math.max(0, nextCount - 1);
    }
    groupStore.patchClub(id, { isMember: want, memberCount: nextCount });
    groupStore.noteMutation(id);

    try {
      const res = await api.clubs.join(id, want);
      if (clubEpoch.get(id) !== epoch) return clubs.get(id)!;
      const isMember = res?.isMember !== undefined ? Boolean(res.isMember) : want;
      const memberCount = finiteNumber(res?.membersCount, nextCount);
      groupStore.patchClub(id, { isMember, memberCount });
      groupStore.noteMutation(id);
      return clubs.get(id)!;
    } catch (e) {
      if (clubEpoch.get(id) === epoch) {
        groupStore.patchClub(id, before);
      }
      throw e;
    }
  },

  // Challenges
  seedChallenges(items: any[], readTick?: number) {
    let changed = false;
    for (const c of items) {
      if (!c?.id || removed.has(c.id)) continue;
      if (readTick != null && readTick < (mutationTick.get(c.id) ?? 0)) continue;
      const cur = challenges.get(c.id);
      const next: ChallengeState = {
        id: c.id,
        title: c.title ?? cur?.title,
        description: c.description !== undefined ? c.description : cur?.description ?? null,
        sportType: c.sportType ?? cur?.sportType,
        targetMeters: c.targetMeters !== undefined ? Number(c.targetMeters) : cur?.targetMeters,
        currentMeters: c.currentMeters !== undefined ? Number(c.currentMeters) : cur?.currentMeters,
        daysRemaining: c.daysRemaining !== undefined ? Number(c.daysRemaining) : cur?.daysRemaining,
        participantsCount: finiteNumber(c.participantsCount, cur?.participantsCount ?? 0),
        isJoined: c.isJoined !== undefined ? Boolean(c.isJoined) : (cur?.isJoined ?? false),
        isCompleted: c.isCompleted !== undefined ? Boolean(c.isCompleted) : cur?.isCompleted,
        creatorId: c.creatorId !== undefined ? c.creatorId : cur?.creatorId ?? null,
        badgeUrl: c.badgeUrl !== undefined ? c.badgeUrl : cur?.badgeUrl ?? null,
      };
      if (
        cur &&
        cur.isJoined === next.isJoined &&
        cur.participantsCount === next.participantsCount &&
        cur.currentMeters === next.currentMeters &&
        cur.title === next.title
      ) {
        continue;
      }
      challenges.set(c.id, next);
      changed = true;
    }
    if (changed) emit();
  },
  getChallenge(id: string): ChallengeState | undefined {
    return challenges.get(id);
  },
  patchChallenge(id: string, patch: Partial<ChallengeState>) {
    const cur = challenges.get(id);
    if (!cur) {
      challenges.set(id, {
        id,
        isJoined: false,
        participantsCount: 0,
        ...patch,
      });
    } else {
      challenges.set(id, { ...cur, ...patch });
    }
    emit();
  },
  async joinChallenge(id: string, want: boolean, fallback?: Partial<ChallengeState>): Promise<ChallengeState> {
    const epoch = (challengeEpoch.get(id) ?? 0) + 1;
    challengeEpoch.set(id, epoch);
    const before = challenges.get(id) ?? {
      id,
      participantsCount: fallback?.participantsCount ?? 0,
      isJoined: fallback?.isJoined ?? !want,
      ...fallback,
    };
    const wasJoined = before.isJoined === true;
    let nextCount = before.participantsCount ?? 0;
    if (want) {
      if (!wasJoined) nextCount += 1;
      nextCount = Math.max(1, nextCount);
    } else {
      if (wasJoined) nextCount = Math.max(0, nextCount - 1);
    }
    groupStore.patchChallenge(id, { isJoined: want, participantsCount: nextCount });
    groupStore.noteMutation(id);

    try {
      const res = await api.challenges.join(id, want);
      if (challengeEpoch.get(id) !== epoch) return challenges.get(id)!;
      const isJoined = res?.isJoined !== undefined ? Boolean(res.isJoined) : want;
      const participantsCount = finiteNumber(res?.participantsCount, nextCount);
      groupStore.patchChallenge(id, { isJoined, participantsCount });
      groupStore.noteMutation(id);
      return challenges.get(id)!;
    } catch (e) {
      if (challengeEpoch.get(id) === epoch) {
        groupStore.patchChallenge(id, before);
      }
      throw e;
    }
  },

  // Events
  seedEvents(items: any[], readTick?: number) {
    let changed = false;
    for (const e of items) {
      if (!e?.id || removed.has(e.id)) continue;
      if (readTick != null && readTick < (mutationTick.get(e.id) ?? 0)) continue;
      const cur = events.get(e.id);
      const next: EventState = {
        id: e.id,
        title: e.title ?? cur?.title,
        sportType: e.sportType ?? cur?.sportType,
        eventDate: e.eventDate ?? cur?.eventDate,
        meetingPoint: e.meetingPoint ?? cur?.meetingPoint,
        paceDescription: e.paceDescription !== undefined ? e.paceDescription : cur?.paceDescription ?? null,
        distanceMeters: e.distanceMeters !== undefined ? e.distanceMeters : cur?.distanceMeters ?? null,
        attendeesCount: finiteNumber(e.attendeesCount, cur?.attendeesCount ?? 0),
        rsvpStatus: e.rsvpStatus !== undefined ? e.rsvpStatus : (cur?.rsvpStatus ?? null),
        clubName: e.clubName !== undefined ? e.clubName : cur?.clubName ?? null,
        creator: e.creator !== undefined ? e.creator : cur?.creator,
      };
      if (
        cur &&
        cur.rsvpStatus === next.rsvpStatus &&
        cur.attendeesCount === next.attendeesCount &&
        cur.title === next.title
      ) {
        continue;
      }
      events.set(e.id, next);
      changed = true;
    }
    if (changed) emit();
  },
  getEvent(id: string): EventState | undefined {
    return events.get(id);
  },
  patchEvent(id: string, patch: Partial<EventState>) {
    const cur = events.get(id);
    if (!cur) {
      events.set(id, {
        id,
        attendeesCount: 0,
        rsvpStatus: null,
        ...patch,
      });
    } else {
      events.set(id, { ...cur, ...patch });
    }
    emit();
  },
  async rsvpEvent(
    id: string,
    next: 'GOING' | 'MAYBE' | 'DECLINED',
    fallback?: Partial<EventState>
  ): Promise<EventState> {
    const epoch = (eventEpoch.get(id) ?? 0) + 1;
    eventEpoch.set(id, epoch);
    const before = events.get(id) ?? {
      id,
      attendeesCount: fallback?.attendeesCount ?? 0,
      rsvpStatus: fallback?.rsvpStatus ?? null,
      ...fallback,
    };
    const wasGoing = before.rsvpStatus === 'GOING';
    const isGoing = next === 'GOING';
    let nextAttendees = before.attendeesCount;
    if (isGoing && !wasGoing) {
      nextAttendees += 1;
    } else if (!isGoing && wasGoing) {
      nextAttendees = Math.max(0, nextAttendees - 1);
    }
    groupStore.patchEvent(id, { rsvpStatus: next === 'DECLINED' ? null : next, attendeesCount: nextAttendees });
    groupStore.noteMutation(id);

    try {
      const res = await api.events.rsvp(id, next);
      if (eventEpoch.get(id) !== epoch) return events.get(id)!;
      const status = (res?.status as 'GOING' | 'MAYBE' | 'DECLINED' | null) ?? (next === 'DECLINED' ? null : next);
      const attendeesCount = finiteNumber(res?.attendeesCount, nextAttendees);
      groupStore.patchEvent(id, { rsvpStatus: status, attendeesCount });
      groupStore.noteMutation(id);
      return events.get(id)!;
    } catch (e) {
      if (eventEpoch.get(id) === epoch) {
        groupStore.patchEvent(id, before);
      }
      throw e;
    }
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  resetForTesting() {
    clubs.clear();
    challenges.clear();
    events.clear();
    removed.clear();
    clubEpoch.clear();
    challengeEpoch.clear();
    eventEpoch.clear();
    mutationTick.clear();
    clock = 0;
    version = 0;
  },
};

export const useClub = (id: string, fallback?: Partial<ClubState>): ClubState | undefined => {
  useSyncExternalStore(groupStore.subscribe, () => version);
  const cur = groupStore.getClub(id);
  if (!cur && fallback) {
    return {
      id,
      memberCount: fallback.memberCount ?? 0,
      isMember: fallback.isMember ?? false,
      ...fallback,
    };
  }
  return cur;
};

export const useChallenge = (id: string, fallback?: Partial<ChallengeState>): ChallengeState | undefined => {
  useSyncExternalStore(groupStore.subscribe, () => version);
  const cur = groupStore.getChallenge(id);
  if (!cur && fallback) {
    return {
      id,
      isJoined: fallback.isJoined ?? false,
      participantsCount: fallback.participantsCount ?? 0,
      ...fallback,
    };
  }
  return cur;
};

export const useEvent = (id: string, fallback?: Partial<EventState>): EventState | undefined => {
  useSyncExternalStore(groupStore.subscribe, () => version);
  const cur = groupStore.getEvent(id);
  if (!cur && fallback) {
    return {
      id,
      attendeesCount: fallback.attendeesCount ?? 0,
      rsvpStatus: fallback.rsvpStatus ?? null,
      ...fallback,
    };
  }
  return cur;
};

export const useGroupRevision = (): number => {
  useSyncExternalStore(groupStore.subscribe, () => version);
  return version;
};

