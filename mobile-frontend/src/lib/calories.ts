/**
 * Calorie ESTIMATE using the MET method (Compendium of Physical Activities):
 *   kcal = MET(sport, speed) × weightKg × movingHours
 * This is our engineering approximation (technical audit MET-01, research §7) — Strava uses its
 * own model which we do not replicate. One function is used live, on save, and for display so
 * every screen shows the same number.
 */
export const DEFAULT_WEIGHT_KG = 70;

type Band = [kmh: number, met: number];

// Speed → MET anchor points; linearly interpolated, clamped at the ends.
const RUN: Band[] = [
  [6.4, 6.0],
  [8.0, 8.3],
  [9.7, 9.8],
  [11.3, 11.0],
  [12.9, 11.8],
  [14.5, 12.8],
  [16.1, 14.5],
];
const WALK: Band[] = [
  [3.2, 2.8],
  [4.0, 3.0],
  [4.8, 3.5],
  [5.6, 4.3],
  [6.4, 5.0],
  [7.2, 7.0],
];
const RIDE: Band[] = [
  [12, 4.0],
  [17.5, 6.8],
  [20.5, 8.0],
  [23.5, 10.0],
  [27.5, 12.0],
  [32, 15.8],
];
const HIKE_MET = 6.0;

const interpolate = (bands: Band[], kmh: number) => {
  if (kmh <= bands[0][0]) return bands[0][1];
  for (let i = 1; i < bands.length; i++) {
    const [x1, y1] = bands[i];
    if (kmh <= x1) {
      const [x0, y0] = bands[i - 1];
      return y0 + ((kmh - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return bands[bands.length - 1][1];
};

export const metFor = (sport: string, avgSpeedMps: number) => {
  const kmh = avgSpeedMps * 3.6;
  switch (sport) {
    case 'Ride':
    case 'Gravel Ride':
    case 'Mountain Bike':
    case 'Virtual Ride':
      return interpolate(RIDE, kmh);
    case 'Walk':
      return interpolate(WALK, kmh);
    case 'Hike':
      return HIKE_MET;
    case 'Run':
    case 'Trail Run':
      return interpolate(RUN, kmh);
    default:
      return null;
  }
};

/** Estimates calories for stationary indoor sports (Workout, Yoga) based on duration & MET. */
export const estimateIndoorCalories = (
  sport: string,
  movingSeconds: number,
  weightKg: number = DEFAULT_WEIGHT_KG
): number => {
  if (!movingSeconds || movingSeconds < 3) return 0;
  const met = sport === 'Yoga' ? 3.5 : 6.0;
  return Math.max(1, Math.round(met * weightKg * (movingSeconds / 3600)));
};

/** Returns null when an estimate isn't meaningful (no movement or unsupported sport). */
export const estimateCalories = (
  sport: string,
  distanceMeters: number,
  movingSeconds: number,
  weightKg: number = DEFAULT_WEIGHT_KG
): number | null => {
  if (!movingSeconds || movingSeconds < 30 || !distanceMeters) return null;
  const met = metFor(sport, distanceMeters / movingSeconds);
  if (met == null) return null;
  return Math.round(met * weightKg * (movingSeconds / 3600));
};
