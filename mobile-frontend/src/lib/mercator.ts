/**
 * Web Mercator helpers for static route previews: pick the zoom that fits a route into a box,
 * list the 256-px tiles that cover it, and project the route onto the same pixel grid so the
 * line sits exactly on the basemap streets.
 */
export type LngLat = [number, number];

const TILE = 256;
const MAX_LAT = 85.05112878;

export const worldSize = (z: number) => TILE * 2 ** z;

/** Global pixel coordinates at zoom z. */
export const project = ([lng, lat]: LngLat, z: number): [number, number] => {
  const W = worldSize(z);
  const phi = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return [((lng + 180) / 360) * W, ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * W];
};

export interface PreviewLayout {
  zoom: number;
  /** Global pixel coordinate of the box's top-left corner. */
  originX: number;
  originY: number;
  tiles: { x: number; y: number; z: number; left: number; top: number }[];
  /** Route in box pixels. */
  points: [number, number][];
}

/**
 * Highest integer zoom (≤ maxZoom) at which the route's bounding box fits in the box minus
 * padding; the route is centred. Returns null for routes with fewer than 2 points.
 */
export const previewLayout = (
  route: LngLat[],
  width: number,
  height: number,
  opts: { padding?: number; maxZoom?: number; minZoom?: number } = {}
): PreviewLayout | null => {
  if (route.length < 2 || width <= 0 || height <= 0) return null;
  const pad = opts.padding ?? 28;
  const maxZoom = opts.maxZoom ?? 16;
  const minZoom = opts.minZoom ?? 2;
  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const [lng, lat] of route) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  let zoom = minZoom;
  for (let z = maxZoom; z >= minZoom; z--) {
    const [x0, y1] = project([minLng, minLat], z);
    const [x1, y0] = project([maxLng, maxLat], z);
    if (x1 - x0 <= width - 2 * pad && y1 - y0 <= height - 2 * pad) {
      zoom = z;
      break;
    }
  }
  const [ax, by] = project([minLng, minLat], zoom);
  const [bx, ay] = project([maxLng, maxLat], zoom);
  const originX = (ax + bx) / 2 - width / 2;
  const originY = (ay + by) / 2 - height / 2;
  const n = 2 ** zoom;
  const tiles: PreviewLayout['tiles'] = [];
  for (let ty = Math.floor(originY / TILE); ty <= Math.floor((originY + height) / TILE); ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = Math.floor(originX / TILE); tx <= Math.floor((originX + width) / TILE); tx++) {
      tiles.push({ x: ((tx % n) + n) % n, y: ty, z: zoom, left: tx * TILE - originX, top: ty * TILE - originY });
    }
  }
  const points = route.map((p) => {
    const [x, y] = project(p, zoom);
    return [x - originX, y - originY] as [number, number];
  });
  return { zoom, originX, originY, tiles, points };
};

/** Evenly thin a long route for drawing (keeps first and last point). */
export const thin = <T,>(pts: T[], max = 400): T[] => {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => pts[Math.round(i * step)]);
};
