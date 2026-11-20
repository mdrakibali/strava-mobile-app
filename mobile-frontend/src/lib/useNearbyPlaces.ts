import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { api, NearbyPlace } from '../services/api';
import { LngLat } from './activityView';

export type NearbyState =
  | { status: 'locating' }
  | { status: 'permission_denied'; canAskAgain: boolean }
  | { status: 'location_off' }
  | { status: 'no_fix' }
  | { status: 'loading'; position: LngLat }
  | { status: 'ready'; position: LngLat; places: NearbyPlace[]; attribution: string }
  | { status: 'error'; position: LngLat | null; message: string };

/** A last-known fix younger than this is good enough to search around (and is instant). */
const MAX_FIX_AGE_MS = 2 * 60_000;

/**
 * Nearby workout places for the athlete's REAL position. There is no fallback location and no
 * fallback list: no permission → permission state, no fix → no_fix, provider down → error.
 */
export const useNearbyPlaces = (sport: string, enabled = true) => {
  const [state, setState] = useState<NearbyState>({ status: 'locating' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const set = (s: NearbyState) => !cancelled && setState(s);
    (async () => {
      set({ status: 'locating' });
      const perm = await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (!perm || !perm.granted) return set({ status: 'permission_denied', canAskAgain: perm?.canAskAgain ?? true });
      if (!(await Location.hasServicesEnabledAsync().catch(() => false))) return set({ status: 'location_off' });
      let fix = await Location.getLastKnownPositionAsync({ maxAge: MAX_FIX_AGE_MS }).catch(() => null);
      if (!fix) fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (!fix) return set({ status: 'no_fix' });
      const position: LngLat = [fix.coords.longitude, fix.coords.latitude];
      set({ status: 'loading', position });
      try {
        const res = await api.places.nearby(position[1], position[0], sport);
        set({ status: 'ready', position, places: res.places, attribution: res.attribution });
      } catch (e: any) {
        set({ status: 'error', position, message: e?.message ?? 'Nearby places are unavailable.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sport, enabled, attempt]);

  return { state, retry };
};

export const PLACE_LABEL: Record<string, { label: string; icon: string }> = {
  park: { label: 'Park', icon: 'leaf-outline' },
  garden: { label: 'Garden', icon: 'flower-outline' },
  nature: { label: 'Nature area', icon: 'trail-sign-outline' },
  track: { label: 'Running track', icon: 'ellipse-outline' },
  trail: { label: 'Trail', icon: 'trail-sign-outline' },
  footpath: { label: 'Walkway', icon: 'walk-outline' },
  cycleway: { label: 'Cycleway', icon: 'bicycle-outline' },
  cycle_route: { label: 'Cycling route', icon: 'bicycle-outline' },
  hiking_route: { label: 'Hiking route', icon: 'trail-sign-outline' },
  recreation: { label: 'Recreation ground', icon: 'football-outline' },
};
