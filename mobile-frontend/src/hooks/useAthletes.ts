import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, AthleteStats } from '../services/api';

export const ATHLETE_QUERY_KEY = ['athletes'] as const;

export function useAthleteProfile(athleteId: string | undefined) {
  return useQuery({
    queryKey: [...ATHLETE_QUERY_KEY, 'profile', athleteId],
    queryFn: async () => {
      if (!athleteId) return null;
      return api.athletes.getProfile(athleteId);
    },
    enabled: Boolean(athleteId),
    staleTime: 60 * 1000,
  });
}

export function useAthleteStats(athleteId: string | undefined) {
  return useQuery({
    queryKey: [...ATHLETE_QUERY_KEY, 'stats', athleteId],
    queryFn: async (): Promise<AthleteStats | null> => {
      if (!athleteId) return null;
      try {
        return await api.athletes.stats(athleteId);
      } catch {
        return null;
      }
    },
    enabled: Boolean(athleteId),
    staleTime: 60 * 1000,
  });
}

export function useAthleteActivities(athleteId: string | undefined) {
  return useQuery({
    queryKey: [...ATHLETE_QUERY_KEY, 'activities', athleteId],
    queryFn: async () => {
      if (!athleteId) return [];
      const res = await api.athletes.listActivities(athleteId);
      return res?.activities || [];
    },
    enabled: Boolean(athleteId),
    staleTime: 60 * 1000,
  });
}

export function useAthleteFollows(athleteId: string | undefined, kind: 'followers' | 'following') {
  return useQuery({
    queryKey: [...ATHLETE_QUERY_KEY, 'follows', athleteId, kind],
    queryFn: async () => {
      if (!athleteId) return [];
      const res = await api.athletes.listFollows(athleteId, kind);
      return res?.athletes || [];
    },
    enabled: Boolean(athleteId),
    staleTime: 30 * 1000,
  });
}

export function useSearchAthletes(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: [...ATHLETE_QUERY_KEY, 'search', query],
    queryFn: async () => {
      const res = await api.athletes.search(query.trim());
      return res?.athletes || [];
    },
    enabled: enabled,
    staleTime: 30 * 1000,
  });
}

export function useFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ athleteId, follow }: { athleteId: string; follow: boolean }) => {
      return follow ? api.athletes.follow(athleteId) : api.athletes.unfollow(athleteId);
    },
    onSuccess: (_data, { athleteId }) => {
      queryClient.invalidateQueries({ queryKey: [...ATHLETE_QUERY_KEY, 'profile', athleteId] });
      queryClient.invalidateQueries({ queryKey: [...ATHLETE_QUERY_KEY, 'follows'] });
      queryClient.invalidateQueries({ queryKey: [...ATHLETE_QUERY_KEY, 'search'] });
    },
  });
}

export function useUpdateMeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: {
      displayName?: string;
      city?: string;
      country?: string;
      bio?: string;
      primarySport?: string;
      weightKg?: number;
      profilePictureUrl?: string;
    }) => {
      return api.athletes.updateMe(patch);
    },
    onSuccess: (data) => {
      if (data?.athlete?.id) {
        queryClient.invalidateQueries({
          queryKey: [...ATHLETE_QUERY_KEY, 'profile', data.athlete.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ATHLETE_QUERY_KEY });
    },
  });
}

