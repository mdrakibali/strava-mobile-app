import { Ionicons } from '@expo/vector-icons';
import { SportType } from '../types';

/** MVP sports (docs/STRAVA_PRODUCT_RESEARCH.md §1). One table drives icons, labels and metric display. */
export interface SportConfig {
  id: SportType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Foot sports show pace; cycling shows speed (research §5). */
  primaryMetric: 'pace' | 'speed';
}

export const MVP_SPORTS: SportConfig[] = [
  { id: 'Run', label: 'Run', icon: 'footsteps', primaryMetric: 'pace' },
  { id: 'Walk', label: 'Walk', icon: 'walk', primaryMetric: 'pace' },
  { id: 'Hike', label: 'Hike', icon: 'trail-sign', primaryMetric: 'pace' },
  { id: 'Ride', label: 'Ride', icon: 'bicycle', primaryMetric: 'speed' },
];

const RIDE_TYPES = new Set(['Ride', 'Gravel Ride', 'Mountain Bike', 'Virtual Ride']);

/** Lookup that also handles legacy/non-MVP sport strings stored by older builds. */
export const sportConfig = (sport: string | null | undefined): SportConfig => {
  const found = MVP_SPORTS.find((s) => s.id === sport);
  if (found) return found;
  if (sport && RIDE_TYPES.has(sport))
    return { id: sport as SportType, label: sport, icon: 'bicycle', primaryMetric: 'speed' };
  if (sport === 'Trail Run')
    return { id: 'Trail Run', label: 'Trail Run', icon: 'footsteps', primaryMetric: 'pace' };
  return {
    id: (sport as SportType) || 'Workout',
    label: sport || 'Activity',
    icon: 'pulse',
    primaryMetric: 'pace',
  };
};
