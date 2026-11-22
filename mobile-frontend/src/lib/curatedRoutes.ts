import { LngLat } from './activityView';

export interface CuratedRoute {
  id: string;
  name: string;
  subtitle: string;
  sportType: 'Ride' | 'Run' | 'Walk' | 'Hike';
  distanceMeters: number;
  elevationGainMeters: number;
  estimatedTimeSeconds: number;
  estTimeText: string;
  surfacePercentPaved: number;
  creatorName: string;
  locationName: string;
  description: string;
  polyline: LngLat[];
  photos: string[];
  isSaved?: boolean;
}

/**
 * Empty curated list: All routes are fetched directly from the backend API and database.
 * No hardcoded or static routes are injected into the application.
 */
export const CURATED_DHAKA_ROUTES: CuratedRoute[] = [];
