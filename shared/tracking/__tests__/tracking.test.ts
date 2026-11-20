import { describe, expect, it } from 'vitest';
import {
  acceptedPoints,
  activeMs,
  elapsedMs,
  estimateCalories,
  haversineM,
  INITIAL_LIFECYCLE,
  InvalidTransitionError,
  isValidCoordinate,
  LifecycleState,
  missingSeqs,
  paceSecPerKm,
  PointFilter,
  RawPoint,
  retryDelayMs,
  sealedBatchCount,
  summarizeTrack,
  TrackAccumulator,
  TRACKING_CONFIG,
  transition,
} from '../index';
import { LAT0, line, LNG0, offset, stationary } from './fixtures';

const T0 = 1_700_000_000_000;
const pt = (over: Partial<RawPoint> = {}): RawPoint => ({
  t: T0,
  lat: LAT0,
  lng: LNG0,
  acc: 5,
  alt: null,
  altAcc: null,
  speed: null,
  seg: 0,
  ...over,
});

describe('haversine', () => {
  it('matches known distances', () => {
    // 1° of latitude ≈ 111.2 km
    expect(haversineM(0, 0, 1, 0)).toBeCloseTo(111_195, -1);
    // London → Paris ≈ 343.5 km (great circle)
    expect(Math.abs(haversineM(51.5074, -0.1278, 48.8566, 2.3522) / 1000 - 343.5)).toBeLessThan(1);
    expect(haversineM(LAT0, LNG0, LAT0, LNG0)).toBe(0);
  });
  it('is symmetric and handles the antimeridian', () => {
    expect(haversineM(10, 179.9999, 10, -179.9999)).toBeCloseTo(haversineM(10, -179.9999, 10, 179.9999), 6);
    expect(haversineM(10, 179.9999, 10, -179.9999)).toBeLessThan(30);
  });
  it('rejects invalid coordinates', () => {
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(NaN, 10)).toBe(false);
    expect(isValidCoordinate(23.7, 90.4)).toBe(true);
  });
});

describe('GPS filter', () => {
  const f = () => new PointFilter(TRACKING_CONFIG.Run);

  it('drops inaccurate, invalid, duplicate and out-of-order fixes', () => {
    const filter = f();
    expect(filter.push(pt()).accepted).toBe(true);
    expect(filter.push(pt({ t: T0 })).reason).toBe('stale'); // exact duplicate
    expect(filter.push(pt({ t: T0 - 1000 })).reason).toBe('stale'); // out of order
    expect(filter.push(pt({ t: T0 + 1000, acc: 80 })).reason).toBe('accuracy');
    expect(filter.push(pt({ t: T0 + 1000, lat: 0, lng: 0 })).reason).toBe('invalid');
    expect(filter.push(pt({ t: T0 + 1000 })).accepted).toBe(true);
  });

  it('rejects a single impossible-speed spike and keeps the track', () => {
    const filter = f();
    filter.push(pt());
    const far = offset(LAT0, LNG0, 0, 500); // 500 m in 1 s
    expect(filter.push(pt({ t: T0 + 1000, ...far })).reason).toBe('speed');
    const near = offset(LAT0, LNG0, 0, 6);
    expect(filter.push(pt({ t: T0 + 2000, ...near })).accepted).toBe(true);
  });

  it('re-anchors after a persistent jump (e.g. tunnel exit) instead of rejecting forever', () => {
    const filter = f();
    filter.push(pt());
    const results = [];
    for (let i = 1; i <= 15; i++) {
      const p = offset(LAT0, LNG0, 0, 2000 + i * 3);
      results.push(filter.push(pt({ t: T0 + i * 1000, ...p })));
    }
    const firstAccepted = results.findIndex((r) => r.accepted);
    expect(firstAccepted).toBeGreaterThan(0);
    expect(results[firstAccepted].gapBefore).toBe(true);
    expect(results.slice(firstAccepted).every((r) => r.accepted)).toBe(true);
  });

  it('starts a new run of track (gap) on a new segment', () => {
    const filter = f();
    filter.push(pt());
    const far = offset(LAT0, LNG0, 0, 3000);
    const r = filter.push(pt({ t: T0 + 1000, seg: 1, ...far }));
    expect(r).toEqual({ accepted: true, gapBefore: true });
  });
});

describe('distance, speed, pace, moving time', () => {
  it('measures a steady 3 m/s run for 10 minutes within 1%', () => {
    const pts = line({ seconds: 600, speedMps: 3, acc: 5 });
    const s = summarizeTrack({ sport: 'Run', points: pts, startedAt: T0, finishedAt: T0 + 600_000, pauses: [] });
    expect(s.distanceM).toBeGreaterThan(1782);
    expect(s.distanceM).toBeLessThan(1818);
    expect(s.movingTimeS).toBeGreaterThanOrEqual(598);
    expect(s.avgSpeedMps!).toBeCloseTo(3, 1);
    expect(paceSecPerKm(s.avgSpeedMps)!).toBeCloseTo(333, -1); // 5:33 /km
    expect(s.maxSpeedMps!).toBeLessThan(3.3);
  });

  it('works without Doppler speed (position deltas only)', () => {
    const pts = line({ seconds: 300, speedMps: 1.4, acc: 6, doppler: false });
    const s = summarizeTrack({ sport: 'Walk', points: pts, startedAt: T0, finishedAt: T0 + 300_000, pauses: [] });
    expect(s.distanceM / 420).toBeGreaterThan(0.97);
    expect(s.distanceM / 420).toBeLessThan(1.03);
    expect(s.movingTimeS).toBeGreaterThan(280);
  });

  it('suppresses stationary GPS drift (plan T-2: ≤ 20 m and ≤ 10 s in 5 min)', () => {
    const pts = stationary({ seconds: 300, jitterM: 4, acc: 8, seed: 7 });
    const s = summarizeTrack({ sport: 'Run', points: pts, startedAt: T0, finishedAt: T0 + 300_000, pauses: [] });
    expect(s.distanceM).toBeLessThanOrEqual(20);
    expect(s.movingTimeS).toBeLessThanOrEqual(10);
  });

  it('suppresses drift even without Doppler speed', () => {
    // white noise up to ±2.5 m per axis with an 8 m reported accuracy
    const pts = stationary({ seconds: 300, jitterM: 2.5, acc: 8, seed: 3, doppler: false });
    const s = summarizeTrack({ sport: 'Walk', points: pts, startedAt: T0, finishedAt: T0 + 300_000, pauses: [] });
    expect(s.distanceM).toBeLessThanOrEqual(20);
    expect(s.movingTimeS).toBeLessThanOrEqual(10);
  });

  it('excludes rests from moving time but not from elapsed time', () => {
    const a = line({ seconds: 120, speedMps: 3 });
    const end = a[a.length - 1];
    const rest = stationary({ t0: end.t + 1000, seconds: 120, jitterM: 1, seed: 2 }).map((p) => ({
      ...p,
      lat: p.lat - LAT0 + end.lat,
      lng: p.lng - LNG0 + end.lng,
    }));
    const b = line({ t0: rest[rest.length - 1].t + 1000, seconds: 120, speedMps: 3, start: { lat: end.lat, lng: end.lng } });
    const pts = [...a, ...rest, ...b];
    const s = summarizeTrack({ sport: 'Run', points: pts, startedAt: T0, finishedAt: b[b.length - 1].t, pauses: [] });
    expect(s.movingTimeS).toBeGreaterThan(235);
    expect(s.movingTimeS).toBeLessThan(250);
    expect(s.elapsedTimeS).toBeGreaterThan(360);
  });

  it('does not bridge distance across a pause (new segment)', () => {
    const a = line({ seconds: 60, speedMps: 3, seg: 0 });
    // athlete walks 2 km while paused; recording resumes far away
    const far = offset(LAT0, LNG0, 0, 2180);
    const b = line({ t0: T0 + 600_000, seconds: 60, speedMps: 3, seg: 1, start: far });
    const s = summarizeTrack({
      sport: 'Run',
      points: [...a, ...b],
      startedAt: T0,
      finishedAt: T0 + 660_000,
      pauses: [[T0 + 60_000, T0 + 600_000]],
    });
    expect(s.distanceM).toBeGreaterThan(355);
    expect(s.distanceM).toBeLessThan(365);
    expect(s.activeTimeS).toBe(120);
    expect(s.elapsedTimeS).toBe(660);
  });

  it('ignores GPS gaps for moving time', () => {
    const a = line({ seconds: 60, speedMps: 3 });
    const end = a[a.length - 1];
    const b = line({ t0: end.t + 120_000, seconds: 60, speedMps: 3, start: offset(end.lat, end.lng, 0, 360) });
    const s = summarizeTrack({ sport: 'Run', points: [...a, ...b], startedAt: T0, finishedAt: b[b.length - 1].t, pauses: [] });
    expect(s.movingTimeS).toBeLessThanOrEqual(122);
  });

  it('reports a current speed that drops to 0 when fixes stop', () => {
    const acc = new TrackAccumulator('Ride');
    for (const p of line({ seconds: 30, speedMps: 8 })) acc.add(p);
    const last = acc.lastAccepted!.t;
    expect(acc.currentSpeedMps(last)).toBeCloseTo(8, 5);
    expect(acc.currentSpeedMps(last + 10_000)).toBe(0);
  });
});

describe('splits', () => {
  it('produces interpolated 1 km splits plus a final partial split', () => {
    const pts = line({ seconds: 900, speedMps: 2.5 }); // 2250 m
    const s = summarizeTrack({ sport: 'Run', points: pts, startedAt: T0, finishedAt: T0 + 900_000, pauses: [] });
    expect(s.splits).toHaveLength(3);
    expect(s.splits[0].distanceM).toBe(1000);
    expect(s.splits[0].movingTimeS).toBeGreaterThanOrEqual(395);
    expect(s.splits[0].movingTimeS).toBeLessThanOrEqual(405);
    expect(s.splits[2].distanceM).toBeGreaterThan(200);
    const totalMoving = s.splits.reduce((a, b) => a + b.movingTimeS, 0);
    expect(Math.abs(totalMoving - s.movingTimeS)).toBeLessThanOrEqual(2);
  });
});

describe('elevation', () => {
  it('counts a sustained climb and ignores noise below the hysteresis', () => {
    // 1 km at 3 m/s climbing 50 m, then 1 km flat with ±4 m noise
    const climb = line({ seconds: 333, speedMps: 3, alt: (m) => 10 + m * 0.05 });
    const end = climb[climb.length - 1];
    const flat = line({
      t0: end.t + 1000,
      seconds: 333,
      speedMps: 3,
      start: { lat: end.lat, lng: end.lng },
      alt: (m) => 60 + 4 * Math.sin(m / 7),
    });
    const s = summarizeTrack({ sport: 'Run', points: [...climb, ...flat], startedAt: T0, finishedAt: flat[flat.length - 1].t, pauses: [] });
    expect(s.elevGainM!).toBeGreaterThanOrEqual(45);
    expect(s.elevGainM!).toBeLessThanOrEqual(55);
  });

  it('reports null when altitude is missing or inaccurate', () => {
    const noAlt = line({ seconds: 120, speedMps: 3 });
    expect(summarizeTrack({ sport: 'Run', points: noAlt, startedAt: T0, finishedAt: T0 + 120_000, pauses: [] }).elevGainM).toBeNull();
    const bad = line({ seconds: 120, speedMps: 3, alt: (m) => m }).map((p) => ({ ...p, altAcc: 40 }));
    expect(summarizeTrack({ sport: 'Run', points: bad, startedAt: T0, finishedAt: T0 + 120_000, pauses: [] }).elevGainM).toBeNull();
  });
});

describe('incremental == batch', () => {
  it('gives identical results whether points arrive one by one or as a stored track', () => {
    const pts = [
      ...line({ seconds: 400, speedMps: 2.8, jitterM: 2, seed: 11, alt: (m) => 20 + m * 0.02 }),
      ...stationary({ t0: T0 + 401_000, seconds: 60, jitterM: 3, seed: 5 }),
    ];
    const live = new TrackAccumulator('Run');
    let snapshot = null;
    for (const p of pts) {
      live.add(p);
      snapshot = live.summary({ startedAt: T0, finishedAt: T0 + 461_000, pauses: [] });
    }
    const batch = summarizeTrack({ sport: 'Run', points: pts, startedAt: T0, finishedAt: T0 + 461_000, pauses: [] });
    expect(snapshot).toEqual(batch);
  });

  it('acceptedPoints matches the accumulator decisions', () => {
    const pts = line({ seconds: 60, speedMps: 3 });
    pts.splice(10, 0, { ...pts[10] }); // duplicate
    pts.push({ ...pts[5] }); // late, out of order
    expect(acceptedPoints('Run', pts)).toHaveLength(61);
  });
});

describe('lifecycle state machine', () => {
  const run = (events: Parameters<typeof transition>[1][], from: LifecycleState = INITIAL_LIFECYCLE) =>
    events.reduce(transition, from);

  it('follows IDLE → PREPARING → RECORDING → PAUSED → RECORDING → COMPLETED', () => {
    const s = run([
      { type: 'PREPARE' },
      { type: 'START', at: T0 },
      { type: 'PAUSE', at: T0 + 60_000 },
      { type: 'RESUME', at: T0 + 90_000 },
      { type: 'FINISH', at: T0 + 150_000 },
    ]);
    expect(s.status).toBe('completed');
    expect(s.segment).toBe(1);
    expect(s.pauses).toEqual([[T0 + 60_000, T0 + 90_000]]);
    expect(s.finishedAt).toBe(T0 + 150_000);
  });

  it('rejects invalid transitions', () => {
    expect(() => run([{ type: 'PAUSE', at: T0 }])).toThrow(InvalidTransitionError);
    expect(() => run([{ type: 'START', at: T0 }, { type: 'START', at: T0 + 1 }])).toThrow(InvalidTransitionError);
    expect(() => run([{ type: 'START', at: T0 }, { type: 'RESUME', at: T0 + 1 }])).toThrow(InvalidTransitionError);
    expect(() => run([{ type: 'START', at: T0 }, { type: 'FINISH', at: T0 + 1 }, { type: 'PAUSE', at: T0 + 2 }])).toThrow(
      InvalidTransitionError
    );
    expect(() => run([{ type: 'DISCARD' }])).toThrow(InvalidTransitionError);
  });

  it('models an interruption as a pause that the athlete resumes or finishes', () => {
    const s = run([{ type: 'START', at: T0 }, { type: 'INTERRUPT', at: T0 + 100_000 }]);
    expect(s.status).toBe('paused');
    expect(s.pauseReason).toBe('interrupted');
    const done = transition(s, { type: 'FINISH', at: T0 + 900_000 });
    // finishing while paused ends the activity at the pause start, not at the later tap
    expect(done.finishedAt).toBe(T0 + 100_000);
    expect(activeMs(done, T0 + 999_999)).toBe(100_000);
  });

  it('can discard from any active state', () => {
    expect(run([{ type: 'START', at: T0 }, { type: 'DISCARD' }]).status).toBe('discarded');
    expect(run([{ type: 'START', at: T0 }, { type: 'FINISH', at: T0 + 5 }, { type: 'DISCARD' }]).status).toBe('discarded');
  });
});

describe('timer', () => {
  it('derives active and elapsed time from wall clock and pauses (no tick drift)', () => {
    let s = transition(INITIAL_LIFECYCLE, { type: 'START', at: T0 });
    expect(activeMs(s, T0 + 61_500)).toBe(61_500);
    s = transition(s, { type: 'PAUSE', at: T0 + 100_000 });
    expect(activeMs(s, T0 + 500_000)).toBe(100_000); // frozen while paused
    s = transition(s, { type: 'RESUME', at: T0 + 200_000 });
    expect(activeMs(s, T0 + 260_000)).toBe(160_000);
    expect(elapsedMs(s, T0 + 260_000)).toBe(260_000);
  });
  it('is zero before start', () => {
    expect(activeMs(INITIAL_LIFECYCLE, T0)).toBe(0);
  });
});

describe('pace and calories', () => {
  it('converts speed to pace and hides pace when stationary', () => {
    expect(paceSecPerKm(1000 / 300)).toBeCloseTo(300, 6);
    expect(paceSecPerKm(0.1)).toBeNull();
    expect(paceSecPerKm(null)).toBeNull();
  });
  it('estimates calories with MET and returns null when not meaningful', () => {
    // 10 km/h → MET 10.025 (interpolated) × 70 kg × 0.5 h = 350.9
    expect(estimateCalories('Run', 5000, 1800, 70)).toBe(351);
    expect(estimateCalories('Run', 0, 1800)).toBeNull();
    expect(estimateCalories('Swim', 1000, 1800)).toBeNull();
  });
});

describe('batch planning and retry', () => {
  it('only seals full batches while recording; the last partial batch is sent at finish', () => {
    expect(sealedBatchCount(0, false)).toBe(0);
    expect(sealedBatchCount(299, false)).toBe(0);
    expect(sealedBatchCount(300, false)).toBe(1);
    expect(sealedBatchCount(301, false)).toBe(1);
    expect(sealedBatchCount(301, true)).toBe(2);
    expect(sealedBatchCount(0, true)).toBe(0);
  });
  it('finds missing batch sequence numbers', () => {
    expect(missingSeqs([0, 2, 2, 4], 6)).toEqual([1, 3, 5]);
    expect(missingSeqs([], 0)).toEqual([]);
  });
  it('backs off exponentially with a 5 minute cap', () => {
    expect(retryDelayMs(0)).toBe(2000);
    expect(retryDelayMs(3)).toBe(16_000);
    expect(retryDelayMs(20)).toBe(300_000);
    expect(retryDelayMs(0, 0.999)).toBeLessThanOrEqual(2500);
  });
});
