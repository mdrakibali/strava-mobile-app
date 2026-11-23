/**
 * Static route maps for lists, rendered natively by MapLibre's snapshotter
 * (StaticMapImageManager) from the OpenFreeMap Positron style with the route drawn INSIDE the
 * style — so the line is exactly on the streets, with real basemap context, and no map engine
 * per list row. Results are cached per route + size; at most two snapshots render at a time.
 */
import { color } from '../../design/tokens';
import { LngLat } from '../../lib/activityView';
import { fitCamera, thin } from '../../lib/mercator';
import { nativeMapModule, styleUrl } from './MapView';

let baseStyle: Promise<any> | null = null;
const loadBaseStyle = () => {
  if (!baseStyle) {
    baseStyle = fetch(styleUrl('positron'))
      .then((r) => {
        if (!r.ok) throw new Error(`style ${r.status}`);
        return r.json();
      })
      .catch((e) => {
        baseStyle = null; // retry next time
        throw e;
      });
  }
  return baseStyle;
};

const withRoute = (style: any, route: LngLat[]) => ({
  ...style,
  sources: {
    ...style.sources,
    'app-route': {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route },
      },
    },
    'app-ends': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { kind: 'start' },
            geometry: { type: 'Point', coordinates: route[0] },
          },
          {
            type: 'Feature',
            properties: { kind: 'end' },
            geometry: { type: 'Point', coordinates: route[route.length - 1] },
          },
        ],
      },
    },
  },
  layers: [
    ...style.layers,
    {
      id: 'app-route-casing',
      type: 'line',
      source: 'app-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#FFFFFF', 'line-width': 7 },
    },
    {
      id: 'app-route-line',
      type: 'line',
      source: 'app-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': color.brand, 'line-width': 4 },
    },
    {
      id: 'app-ends',
      type: 'circle',
      source: 'app-ends',
      paint: {
        'circle-radius': 6,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#FFFFFF',
        'circle-color': ['match', ['get', 'kind'], 'start', color.routeStart, color.routeEnd],
      },
    },
  ],
});

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
let running = 0;
const waiters: (() => void)[] = [];
const acquire = async () => {
  if (running >= 2) await new Promise<void>((r) => waiters.push(r));
  running++;
};
const release = () => {
  running--;
  waiters.shift()?.();
};

export const snapshotAvailable = () => Boolean(nativeMapModule?.StaticMapImageManager);

const keyOf = (route: LngLat[], w: number, h: number) =>
  `${route.length}:${route[0].join(',')}:${route[route.length - 1].join(',')}:${route[Math.floor(route.length / 2)].join(',')}:${w}x${h}`;

/** File URI of a PNG of the route on a real map. Rejects when snapshots aren't possible. */
export const routeSnapshot = (
  route: LngLat[],
  width: number,
  height: number,
  force = false
): Promise<string> => {
  const pts = thin(route, 400);
  const key = keyOf(pts, width, height);
  if (!force && cache.has(key)) return Promise.resolve(cache.get(key)!);
  if (inflight.has(key)) return inflight.get(key)!;
  const job = (async () => {
    const mgr = nativeMapModule?.StaticMapImageManager;
    if (!mgr) throw new Error('Static maps need the development build');
    const cam = fitCamera(pts, width, height, { padding: 26, maxZoom: 16 });
    if (!cam) throw new Error('Route too short');
    const style = withRoute(await loadBaseStyle(), pts);
    await acquire();
    try {
      const uri = await mgr.createImage({
        mapStyle: style,
        center: cam.center,
        zoom: cam.zoom,
        width,
        height,
        output: 'file',
        logo: false,
      });
      cache.set(key, uri);
      return uri;
    } finally {
      release();
    }
  })();
  inflight.set(key, job);
  job.finally(() => inflight.delete(key)).catch(() => {});
  return job;
};
