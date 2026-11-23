import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface ChallengeItem {
  id: string;
  title: string;
  description: string | null;
  sportType: string;
  targetMeters: number;
  currentMeters: number;
  daysRemaining: number;
  isJoined: boolean;
  isCompleted: boolean;
  participantsCount: number;
  badgeUrl?: string | null;
  creatorId?: string | null;
}

export interface ClubItem {
  id: string;
  name: string;
  sportType: string;
  city: string | null;
  country?: string | null;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  memberCount: number;
  isMember: boolean;
  userRole?: string | null;
  isPrivate?: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  sportType: string;
  eventDate: string;
  dateFormatted?: string;
  timeFormatted?: string;
  meetingPoint: string;
  paceDescription: string | null;
  distanceMeters: number | null;
  attendeesCount: number;
  rsvpStatus: 'GOING' | 'MAYBE' | 'DECLINED' | null;
  clubName: string | null;
  creator?: any;
}

export const groupKeys = {
  all: ['groups'] as const,
  challenges: () => [...groupKeys.all, 'challenges'] as const,
  challengeDetail: (id: string) => [...groupKeys.all, 'challenges', id] as const,
  clubs: (query?: string, filter?: 'my') =>
    [...groupKeys.all, 'clubs', { query: query ?? '', filter: filter ?? '' }] as const,
  clubDetail: (id: string) => [...groupKeys.all, 'clubs', 'detail', id] as const,
  events: () => [...groupKeys.all, 'events'] as const,
  eventDetail: (id: string) => [...groupKeys.all, 'events', 'detail', id] as const,
};

// ==========================================
// 1. CHALLENGES
// ==========================================

export function useChallenges() {
  return useQuery({
    queryKey: groupKeys.challenges(),
    queryFn: async (): Promise<ChallengeItem[]> => {
      const res = await api.challenges.list();
      return (res?.challenges || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description ?? null,
        sportType: c.sportType,
        targetMeters: Number(c.targetMeters) || 0,
        currentMeters: Number(c.currentMeters) || 0,
        daysRemaining: Number(c.daysRemaining) || 0,
        isJoined: Boolean(c.isJoined),
        isCompleted: Boolean(c.isCompleted),
        participantsCount: Number(c.participantsCount) || 0,
        badgeUrl: c.badgeUrl ?? null,
        creatorId: c.creatorId ?? null,
      }));
    },
  });
}

export function useChallengeDetail(id?: string) {
  return useQuery({
    queryKey: groupKeys.challengeDetail(id || ''),
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Challenge ID required');
      const res = await api.challenges.get(id);
      if (!res?.challenge) return null;
      const c = res.challenge;
      return {
        challenge: {
          id: c.id,
          title: c.title,
          description: c.description || '',
          sportType: c.sportType,
          targetMeters: c.targetMeters,
          badgeUrl: c.badgeUrl,
          participantsCount: c.participantsCount || 0,
          isJoined: Boolean(c.isJoined),
          currentMeters: c.userProgress ? c.userProgress.currentMeters : 0,
          isCompleted: c.userProgress ? c.userProgress.isCompleted : false,
          daysRemaining: Number(c.daysRemaining) || 0,
          creatorId: c.creatorId ?? null,
        },
        leaderboard: res.leaderboard || [],
      };
    },
  });
}

export function useToggleJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, join }: { id: string; join: boolean }) => {
      return api.challenges.join(id, join);
    },
    onMutate: async ({ id, join }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.all });
      const previousChallenges = queryClient.getQueryData<ChallengeItem[]>(groupKeys.challenges());
      const previousDetail = queryClient.getQueryData<any>(groupKeys.challengeDetail(id));

      queryClient.setQueryData(groupKeys.challenges(), (old?: ChallengeItem[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((ch) =>
          ch.id === id
            ? {
                ...ch,
                isJoined: join,
                participantsCount: join
                  ? (ch.participantsCount || 0) + 1
                  : Math.max(0, (ch.participantsCount || 0) - 1),
              }
            : ch
        );
      });

      queryClient.setQueryData(groupKeys.challengeDetail(id), (old?: any) => {
        if (!old?.challenge) return old;
        return {
          ...old,
          challenge: {
            ...old.challenge,
            isJoined: join,
            participantsCount: join
              ? (old.challenge.participantsCount || 0) + 1
              : Math.max(0, (old.challenge.participantsCount || 0) - 1),
          },
        };
      });

      return { previousChallenges, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousChallenges) {
        queryClient.setQueryData(groupKeys.challenges(), context.previousChallenges);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(groupKeys.challengeDetail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.challenges() });
      queryClient.invalidateQueries({ queryKey: groupKeys.challengeDetail(id) });
    },
  });
}

export function useCreateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      sportType: string;
      targetMeters: number;
      description?: string;
      startDate: string;
      endDate: string;
    }) => api.challenges.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.challenges() });
    },
  });
}

export function useUpdateChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) =>
      api.challenges.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.challenges() });
      queryClient.invalidateQueries({ queryKey: groupKeys.challengeDetail(id) });
    },
  });
}

export function useDeleteChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.challenges.remove(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.challenges() });
      queryClient.removeQueries({ queryKey: groupKeys.challengeDetail(id) });
    },
  });
}

// ==========================================
// 2. CLUBS
// ==========================================

export function useClubs(query?: string, filter?: 'my') {
  return useQuery({
    queryKey: groupKeys.clubs(query, filter),
    queryFn: async (): Promise<ClubItem[]> => {
      const res = await api.clubs.list(query, filter);
      return (res?.clubs || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        sportType: c.sportType,
        city: c.city ?? null,
        country: c.country ?? null,
        description: c.description ?? null,
        avatarUrl: c.avatarUrl ?? null,
        bannerUrl: c.bannerUrl ?? null,
        memberCount: Number(c.memberCount ?? c.membersCount) || 0,
        isMember: Boolean(c.isMember),
        userRole: c.userRole ?? null,
        isPrivate: Boolean(c.isPrivate),
      }));
    },
  });
}

export function useClubDetail(id?: string) {
  return useQuery({
    queryKey: groupKeys.clubDetail(id || ''),
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Club ID required');
      const res = await api.clubs.get(id);
      if (!res?.club) return null;
      return {
        club: {
          id: res.club.id,
          name: res.club.name,
          sportType: res.club.sportType,
          city: res.club.city || '',
          country: res.club.country || '',
          description: res.club.description || '',
          avatarUrl: res.club.avatarUrl,
          bannerUrl: res.club.bannerUrl,
          memberCount: res.club.membersCount ?? res.club.memberCount ?? 0,
          isMember: Boolean(res.club.isMember),
          userRole: res.club.userRole ?? null,
          isPrivate: Boolean(res.club.isPrivate),
        },
        weeklyLeaderboard: res.weeklyLeaderboard || [],
      };
    },
  });
}

export function useToggleJoinClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, join }: { id: string; join: boolean }) => {
      return api.clubs.join(id, join);
    },
    onMutate: async ({ id, join }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.all });
      const previousClubs = queryClient.getQueryData<ClubItem[]>(groupKeys.clubs());
      const previousDetail = queryClient.getQueryData<any>(groupKeys.clubDetail(id));

      queryClient.setQueryData(groupKeys.clubs(), (old?: ClubItem[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((cl) =>
          cl.id === id
            ? {
                ...cl,
                isMember: join,
                memberCount: join
                  ? (cl.memberCount || 0) + 1
                  : Math.max(0, (cl.memberCount || 0) - 1),
              }
            : cl
        );
      });

      queryClient.setQueryData(groupKeys.clubDetail(id), (old?: any) => {
        if (!old?.club) return old;
        return {
          ...old,
          club: {
            ...old.club,
            isMember: join,
            memberCount: join
              ? (old.club.memberCount || 0) + 1
              : Math.max(0, (old.club.memberCount || 0) - 1),
          },
        };
      });

      return { previousClubs, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousClubs) {
        queryClient.setQueryData(groupKeys.clubs(), context.previousClubs);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(groupKeys.clubDetail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...groupKeys.all, 'clubs'] });
      queryClient.invalidateQueries({ queryKey: groupKeys.clubDetail(id) });
    },
  });
}

export function useCreateClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      sportType: string;
      city?: string;
      country?: string;
      description?: string;
      isPrivate?: boolean;
    }) => api.clubs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...groupKeys.all, 'clubs'] });
    },
  });
}

export function useUpdateClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) =>
      api.clubs.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [...groupKeys.all, 'clubs'] });
      queryClient.invalidateQueries({ queryKey: groupKeys.clubDetail(id) });
    },
  });
}

export function useDeleteClub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.clubs.remove(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [...groupKeys.all, 'clubs'] });
      queryClient.removeQueries({ queryKey: groupKeys.clubDetail(id) });
    },
  });
}

// ==========================================
// 3. EVENTS
// ==========================================

export function useEvents() {
  return useQuery({
    queryKey: groupKeys.events(),
    queryFn: async (): Promise<EventItem[]> => {
      const res = await api.events.list();
      return (res?.events || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        sportType: e.sportType,
        eventDate: e.eventDate,
        dateFormatted: e.dateFormatted,
        timeFormatted: e.timeFormatted,
        meetingPoint: e.meetingPoint,
        paceDescription: e.paceDescription ?? null,
        distanceMeters: Number(e.distanceMeters || 0),
        attendeesCount: Number(e.attendeesCount) || 0,
        rsvpStatus: e.rsvpStatus ?? null,
        clubName: e.clubName ?? null,
        creator: e.creator ?? null,
      }));
    },
  });
}

export function useEventDetail(id?: string) {
  return useQuery({
    queryKey: groupKeys.eventDetail(id || ''),
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id) throw new Error('Event ID required');
      const res = await api.events.get(id);
      return {
        event: res.event,
        attendees: res.attendees || [],
      };
    },
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'GOING' | 'MAYBE' | 'DECLINED' }) => {
      return api.events.rsvp(id, status);
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: groupKeys.all });
      const previousEvents = queryClient.getQueryData<EventItem[]>(groupKeys.events());
      const previousDetail = queryClient.getQueryData<any>(groupKeys.eventDetail(id));

      const isGoing = status === 'GOING';
      queryClient.setQueryData(groupKeys.events(), (old?: EventItem[]) => {
        if (!Array.isArray(old)) return old;
        return old.map((ev) => {
          if (ev.id !== id) return ev;
          const wasGoing = ev.rsvpStatus === 'GOING';
          let nextAttendees = ev.attendeesCount;
          if (isGoing && !wasGoing) nextAttendees += 1;
          if (!isGoing && wasGoing) nextAttendees = Math.max(0, nextAttendees - 1);
          return {
            ...ev,
            rsvpStatus: status === 'DECLINED' ? null : status,
            attendeesCount: nextAttendees,
          };
        });
      });

      queryClient.setQueryData(groupKeys.eventDetail(id), (old?: any) => {
        if (!old?.event) return old;
        const wasGoing = old.event.rsvpStatus === 'GOING';
        let nextAttendees = Number(old.event.attendeesCount || 0);
        if (isGoing && !wasGoing) nextAttendees += 1;
        if (!isGoing && wasGoing) nextAttendees = Math.max(0, nextAttendees - 1);
        return {
          ...old,
          event: {
            ...old.event,
            rsvpStatus: status === 'DECLINED' ? null : status,
            attendeesCount: nextAttendees,
          },
        };
      });

      return { previousEvents, previousDetail };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(groupKeys.events(), context.previousEvents);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(groupKeys.eventDetail(id), context.previousDetail);
      }
    },
    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.events() });
      queryClient.invalidateQueries({ queryKey: groupKeys.eventDetail(id) });
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      sportType: string;
      eventDate: string;
      meetingPoint: string;
      paceDescription?: string;
      distanceMeters?: number;
      clubId?: string;
    }) => api.events.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: groupKeys.events() });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<any> }) =>
      api.events.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.events() });
      queryClient.invalidateQueries({ queryKey: groupKeys.eventDetail(id) });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.events.remove(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: groupKeys.events() });
      queryClient.removeQueries({ queryKey: groupKeys.eventDetail(id) });
    },
  });
}
