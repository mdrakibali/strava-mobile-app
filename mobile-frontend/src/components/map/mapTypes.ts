/**
 * Basemap style configuration — the single place to change the app's map look.
 * One active style per map instance; screens only pass a `MapStyleKey`.
 *
 *  - positron: OpenFreeMap light, minimal (DEFAULT). Flat buildings, soft roads, no extrusions.
 *  - bright:   OpenFreeMap OSM-Bright look (more colour, alternative).
 *  - voyager:  CARTO Voyager GL (alternative). CARTO's free basemap terms are non-commercial;
 *              a commercial release needs a CARTO licence, so it is never the default.
 *
 * OpenFreeMap: no API key, no request limit stated, free for commercial use, best-effort (no SLA).
 * Attribution required: OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap
 * (https://openfreemap.org/tos/). Voyager requires "© CARTO © OpenStreetMap contributors".
 * "liberty" (3D buildings, busy POIs) was removed on purpose.
 */
export const MAP_STYLES = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

export const DEFAULT_MAP_STYLE: MapStyleKey = 'positron';

/** Options for the existing "Map style" sheets (record + maps tab). */
export const MAP_STYLE_OPTIONS: { id: MapStyleKey; title: string; description: string; icon: 'sunny-outline' | 'contrast-outline' | 'map-outline' }[] = [
  { id: 'positron', title: 'Light', description: 'Clean minimal map so your route stands out', icon: 'sunny-outline' },
  { id: 'bright', title: 'Bright', description: 'More colour for streets and parks', icon: 'contrast-outline' },
  { id: 'voyager', title: 'Voyager', description: 'Soft colour street map (CARTO)', icon: 'map-outline' },
];

/** Persisted/legacy values (e.g. old 'liberty') fall back to the default. */
export const toMapStyleKey = (k?: string | null): MapStyleKey =>
  k && Object.prototype.hasOwnProperty.call(MAP_STYLES, k) ? (k as MapStyleKey) : DEFAULT_MAP_STYLE;

export const MAP_ATTRIBUTION = '© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors';

export type MapTypeOption = 'standard' | 'satellite' | 'hybrid' | 'winter';
export type HeatmapTypeOption = 'none' | 'global_run' | 'weekly' | 'night' | 'personal';
export type TerrainTypeOption = 'none' | 'aspect' | 'avalanche' | 'gradient';

export interface MapMarkerItem {
  id: string;
  coordinate: [number, number]; // [longitude, latitude]
  title: string;
  subtitle?: string;
  type: 'route' | 'segment';
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
