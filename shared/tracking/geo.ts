const EARTH_RADIUS_M = 6_371_008.8; // IUGG mean radius
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres (haversine). Accurate to ~0.5% — far below GPS error. */
export const haversineM = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const isValidCoordinate = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  // (0,0) "Null Island" is what broken providers emit before a fix.
  !(lat === 0 && lng === 0);
