import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const PRIVACY_ZONES_KEY = ['privacyZones'] as const;

export function usePrivacyZones() {
  return useQuery({
    queryKey: PRIVACY_ZONES_KEY,
    queryFn: async () => {
      const res = await api.privacyZones.list();
      return res?.privacyZones || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreatePrivacyZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
    }) => {
      const res = await api.privacyZones.create(data);
      return res?.privacyZone;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRIVACY_ZONES_KEY });
    },
  });
}

export function useDeletePrivacyZone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.privacyZones.delete(id);
    },
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: PRIVACY_ZONES_KEY });
      const previous = queryClient.getQueryData<any[]>(PRIVACY_ZONES_KEY);
      if (previous) {
        queryClient.setQueryData<any[]>(
          PRIVACY_ZONES_KEY,
          previous.filter((z) => z.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(PRIVACY_ZONES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PRIVACY_ZONES_KEY });
    },
  });
}

