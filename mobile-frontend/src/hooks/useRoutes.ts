import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, NearbyPlace, PlaceDetails, RoutePlan } from '../services/api';
import { SportType } from '../types';

export const ROUTES_QUERY_KEY = ['routes'] as const;
export const PLACES_QUERY_KEY = ['places'] as const;

export function useRoutesList(sport?: string) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, 'list', sport ?? 'All'],
    queryFn: async () => {
      const res = await api.routes.list(sport === 'All' ? undefined : sport);
      return res?.routes || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useSavedRoutes() {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, 'saved'],
    queryFn: async () => {
      const res = await api.routes.getSaved();
      return res?.savedRoutes || [];
    },
    staleTime: 60 * 1000,
  });
}

export function useRouteDetail(id: string | undefined) {
  return useQuery({
    queryKey: [...ROUTES_QUERY_KEY, 'detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await api.routes.get(id);
      return res?.route || null;
    },
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useToggleSaveRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return api.routes.toggleSave(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ROUTES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...ROUTES_QUERY_KEY, 'detail', id] });
    },
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      sportType: SportType;
      distanceMeters: number;
      elevationGainMeters?: number;
      estimatedTimeSeconds?: number;
      polylinePoints: string;
      description?: string;
      surfaceTypes?: { pavedPercent: number; unpavedPercent: number };
      elevationProfile?: number[];
    }) => {
      return api.routes.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROUTES_QUERY_KEY });
    },
  });
}

export function useNearbyPlacesQuery(
  lat: number | null | undefined,
  lng: number | null | undefined,
  sport: string,
  radiusM: number = 5000,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...PLACES_QUERY_KEY, 'nearby', lat, lng, sport, radiusM],
    queryFn: async (): Promise<{ places: NearbyPlace[]; attribution: string }> => {
      if (lat == null || lng == null) {
        return { places: [], attribution: '' };
      }
      const res = await api.places.nearby(lat, lng, sport, radiusM);
      return {
        places: res?.places || [],
        attribution: res?.attribution || '',
      };
    },
    enabled: enabled && lat != null && lng != null,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlaceDetailsQuery(placeId: string | undefined) {
  return useQuery({
    queryKey: [...PLACES_QUERY_KEY, 'details', placeId],
    queryFn: async (): Promise<PlaceDetails | null> => {
      if (!placeId) return null;
      return api.places.details(placeId);
    },
    enabled: Boolean(placeId),
    staleTime: 10 * 60 * 1000,
  });
}

export function usePlanRouteMutation() {
  return useMutation({
    mutationFn: async (data: {
      sport: SportType;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
    }): Promise<RoutePlan> => {
      return api.routing.plan(data.sport, data.from, data.to);
    },
  });
}
