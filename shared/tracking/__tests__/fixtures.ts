import { RawPoint } from '../types';

export const LAT0 = 23.78;
export const LNG0 = 90.42;
const M_PER_DEG_LAT = 111_320;
const mPerDegLng = (lat: number) => 111_320 * Math.cos((lat * Math.PI) / 180);

/** Deterministic pseudo-random (mulberry32) so jitter fixtures are reproducible. */
export const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const offset = (lat: number, lng: number, northM: number, eastM: number) => ({
  lat: lat + northM / M_PER_DEG_LAT,
  lng: lng + eastM / mPerDegLng(lat),
});

interface LineOpts {
  t0?: number;
  seconds: number;
  speedMps: number;
  hz?: number;
  acc?: number;
  seg?: number;
  start?: { lat: number; lng: number };
  /** Altitude as a function of metres travelled. */
  alt?: (m: number) => number | null;
  doppler?: boolean;
  jitterM?: number;
  seed?: number;
}

/** Straight eastward track at constant speed. */
export const line = (o: LineOpts): RawPoint[] => {
  const hz = o.hz ?? 1;
  const start = o.start ?? { lat: LAT0, lng: LNG0 };
  const rand = rng(o.seed ?? 1);
  const pts: RawPoint[] = [];
  for (let i = 0; i <= o.seconds * hz; i++) {
    const s = i / hz;
    const m = o.speedMps * s;
    const jx = o.jitterM ? (rand() - 0.5) * 2 * o.jitterM : 0;
    const jy = o.jitterM ? (rand() - 0.5) * 2 * o.jitterM : 0;
    const pos = offset(start.lat, start.lng, jy, m + jx);
    pts.push({
      t: (o.t0 ?? 1_700_000_000_000) + Math.round(s * 1000),
      lat: pos.lat,
      lng: pos.lng,
      acc: o.acc ?? 5,
      alt: o.alt ? o.alt(m) : null,
      altAcc: o.alt ? 3 : null,
      speed: o.doppler === false ? null : o.speedMps,
      seg: o.seg ?? 0,
    });
  }
  return pts;
};

/** Phone lying still: positions wander around one spot. Doppler speed ~0. */
export const stationary = (o: { t0?: number; seconds: number; jitterM: number; acc?: number; seed?: number; doppler?: boolean }) =>
  line({ t0: o.t0, seconds: o.seconds, speedMps: 0, jitterM: o.jitterM, acc: o.acc ?? 8, seed: o.seed, doppler: o.doppler });
