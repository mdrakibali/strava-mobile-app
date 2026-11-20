import { useSyncExternalStore } from 'react';
import { LngLat } from './activityView';

/**
 * The route the athlete chose to FOLLOW (from Maps → route preview). It is only a reference
 * overlay on the recorder; the recording engine never reads it, and the saved activity is built
 * exclusively from recorded GPS points.
 */
export interface PlannedRoute {
  name: string;
  sport: string;
  geometry: LngLat[];
  distanceM: number;
  durationS: number;
  elevationGainM: number | null;
}

let current: PlannedRoute | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const plannedRouteStore = {
  set(r: PlannedRoute | null) {
    current = r;
    emit();
  },
  get: () => current,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export const usePlannedRoute = () => useSyncExternalStore(plannedRouteStore.subscribe, plannedRouteStore.get);
