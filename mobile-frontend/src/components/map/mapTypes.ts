/**
 * OpenFreeMap vector styles (OpenStreetMap data, OpenMapTiles schema). Public instance: no API key,
 * no registration, no request limits stated (https://openfreemap.org/quick_start/).
 *  - liberty:  full colour (parks, water, POIs, paths) → interactive maps (detail, Maps tab, recorder)
 *  - positron: light grey → small route previews, where the orange route must dominate
 *  - bright:   OSM-Bright look, kept as an option
 * Attribution required: OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap.
 */
export const MAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
};

export const MAP_ATTRIBUTION = '© OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors';

export type MapStyleKey = keyof typeof MAP_STYLES;

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
