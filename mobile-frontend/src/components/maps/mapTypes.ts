import { LngLat } from '../../lib/activityView';

export type MapSource = 'routes' | 'saved' | 'nearby' | 'activities';

export interface MapItem {
  id: string;
  kind: 'route' | 'activity' | 'place';
  name: string;
  subtitle: string;
  sportType: string;
  paths: LngLat[][];
  anchor: LngLat;
  distanceFromMeM: number | null;
  saved: boolean;
  distanceMeters: number;
  elevationGainMeters: number;
  estimatedTimeSeconds: number;
  estTimeText: string;
  surfacePercentPaved: number;
  description: string;
  creatorName: string;
  locationName: string;
  photos: string[];
  placeCategory?: string;
  placeAddress?: string | null;
  osmUrl?: string;
  difficulty?: string;
  elevationProfile?: number[];
}
