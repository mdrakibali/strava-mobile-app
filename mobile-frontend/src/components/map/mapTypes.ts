export const MAP_STYLES = {
  positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

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
