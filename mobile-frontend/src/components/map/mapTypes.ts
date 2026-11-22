/**
 * Basemap style configuration — the single place to change the app's map look.
 * Centralized provider configuration using MapTiler Cloud with graceful fallbacks.
 *
 *  - outdoor:   Light Outdoor style (Explore Map). Clean, high-contrast roads, paths, parks, water.
 *  - dark_topo: Dark Topographic style (Route Builder). Deep charcoal & muted green palette.
 *  - positron:  OpenFreeMap light, minimal.
 *  - bright:    OpenFreeMap OSM-Bright look.
 *  - voyager:   CARTO Voyager GL street map.
 */
const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_API_KEY;

export const MAP_STYLES = {
  outdoor: MAPTILER_KEY
    ? `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${MAPTILER_KEY}`
    : 'https://tiles.openfreemap.org/styles/bright',
  dark_topo: MAPTILER_KEY
    ? `https://api.maptiler.com/maps/topo-v2/style.json?key=${MAPTILER_KEY}`
    : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

export const DEFAULT_MAP_STYLE: MapStyleKey = 'outdoor';

/** Options for the "Map style" sheets (record + maps tab). */
export const MAP_STYLE_OPTIONS: { id: MapStyleKey; title: string; description: string; icon: 'sunny-outline' | 'contrast-outline' | 'map-outline' | 'moon-outline' }[] = [
  { id: 'outdoor', title: 'Outdoor Light', description: 'Clean outdoor map with trails, paths and parks', icon: 'sunny-outline' },
  { id: 'dark_topo', title: 'Dark Topo', description: 'Dark topographic map with terrain and contours', icon: 'moon-outline' },
  { id: 'positron', title: 'Minimal Light', description: 'Clean minimal map so your route stands out', icon: 'contrast-outline' },
  { id: 'bright', title: 'Bright Streets', description: 'High-contrast streets and neighborhoods', icon: 'map-outline' },
];

/** Persisted/legacy values fall back to the default. */
export const toMapStyleKey = (k?: string | null): MapStyleKey =>
  k && Object.prototype.hasOwnProperty.call(MAP_STYLES, k) ? (k as MapStyleKey) : DEFAULT_MAP_STYLE;

export const MAP_ATTRIBUTION = '© OpenStreetMap contributors · © MapTiler';

export type MapTypeOption = 'standard' | 'satellite' | 'hybrid' | 'winter';
export type HeatmapTypeOption = 'none' | 'global_run' | 'weekly' | 'night' | 'personal';
export type TerrainTypeOption = 'none' | 'aspect' | 'avalanche' | 'gradient';

export interface MapMarkerItem {
  id: string;
  coordinate: [number, number]; // [longitude, latitude]
  title: string;
  subtitle?: string;
  type: 'route' | 'segment' | 'place';
  category?: string;
}

export interface StravaMapViewProps {
  styleKey?: MapStyleKey;
  mapType?: MapTypeOption;
  heatmapType?: HeatmapTypeOption;
  terrainType?: TerrainTypeOption;
  is3D?: boolean;
  poiEnabled?: boolean;
  bikeLanesEnabled?: boolean;
  centerCoordinate?: [number, number];
  userLocation?: [number, number];
  zoomLevel?: number;
  routeCoordinates?: [number, number][];
  heatmapRoutes?: [number, number][][];
  markers?: MapMarkerItem[];
  selectedMarkerId?: string;
  onMarkerPress?: (marker: MapMarkerItem) => void;
  onMapPress?: (coordinate: [number, number]) => void;
  showControls?: boolean;
  showUserLocation?: boolean;
  mode?: 'live-record' | 'view-route' | 'explore';
  followUser?: boolean;
  autoFitRoute?: boolean;
  className?: string;
  children?: React.ReactNode;
}
