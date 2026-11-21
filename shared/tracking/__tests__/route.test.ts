import { describe, expect, it } from 'vitest';
import { RawPoint, routePoints, routeSegments, summarizeTrack, TrackAccumulator, RouteSegments } from '../index';
import { line, stationary } from './fixtures';

const T0 = 1_700_000_000_000;

/**
 * Real fixes recorded on a physical Android phone resting in one place for ~2.5 minutes, with
 * one pause/resume (segment 0 -> 1). Pulled from the app's SQLite DB: [t offset ms, lat, lng,
 * acc, speed, seg]. Before the fix, the map drew a straight line between the segment anchors
 * while the distance read 0.00 km.
 */
const DEVICE_STATIONARY: [number, number, number, number, number, number][] = [
  [0, 23.7851992, 90.4249295, 14.6840000152588, 0.0, 0],
  [51509, 23.7852051, 90.42493, 13.4530000686646, 0.0, 0],
  [56599, 23.7852051, 90.42493, 13.4530000686646, 0.0, 0],
  [62138, 23.7852073, 90.4249243, 23.7779998779297, 0.0, 0],
  [62488, 23.7852074, 90.4249243, 23.7779998779297, 0.0, 0],
  [67587, 23.7852018, 90.42493, 7.52099990844727, 0.0, 0],
  [73138, 23.7852009, 90.4249293, 7.84899997711182, 0.0, 0],
  [95360, 23.7851738, 90.42497, 13.2089996337891, 0.417860567569733, 0],
  [108360, 23.7852196, 90.4249878, 10.5799999237061, 0.0864094719290733, 0],
  [107640, 23.7852174, 90.4249873, 10.5240001678467, 0.0726345255970955, 0],
  [128840, 23.7852598, 90.4249692, 11.5640001296997, 0.272961884737015, 1],
  [144928, 23.7852221, 90.4249471, 20.0, 0.0261124484241009, 1],
];
const deviceTrack: RawPoint[] = DEVICE_STATIONARY.map(([dt, lat, lng, acc, speed, seg]) => ({
  t: T0 + dt, lat, lng, acc, alt: null, altAcc: null, speed, seg,
}));

describe('route segments', () => {
  it('draws no route and credits no distance for a real recording made while standing still', () => {
    const s = summarizeTrack({ sport: 'Run', points: deviceTrack, startedAt: T0, finishedAt: T0 + 145_000, pauses: [] });
    expect(s.distanceM).toBeLessThan(5);
    expect(routeSegments('Run', deviceTrack)).toEqual([]);
    expect(routePoints('Run', deviceTrack)).toEqual([]);
  });

  it('does not join runs across a pause, and a run that never moved is not drawn', () => {
    const a = line({ seconds: 60, speedMps: 3, acc: 5 }); // real movement, seg 0
    const end = a[a.length - 1];
    // resume 20 s later, 5 m further on, then stand still in seg 1
    const rest = stationary({ t0: end.t + 20_000, seconds: 60, jitterM: 1, seed: 5, start: { lat: end.lat, lng: end.lng } }).map((p) => ({ ...p, seg: 1 }));
    const runs = routeSegments('Run', [...a, ...rest]);
    expect(runs).toHaveLength(1); // seg 1 never moved: no stub, no connecting line
    expect(runs[0].length).toBeGreaterThan(5);
  });

  it('keeps two moving runs separate when the athlete moves again after the pause', () => {
    const a = line({ seconds: 60, speedMps: 3, acc: 5 });
    const end = a[a.length - 1];
    const b = line({ t0: end.t + 30_000, seconds: 60, speedMps: 3, acc: 5, seg: 1, start: { lat: end.lat + 0.001, lng: end.lng } });
    const runs = routeSegments('Run', [...a, ...b]);
    expect(runs).toHaveLength(2);
    expect(runs[0].every((p) => p.seg === 0)).toBe(true);
    expect(runs[1].every((p) => p.seg === 1)).toBe(true);
  });

  it('incremental builder (live map) matches the batch result', () => {
    const pts = [...line({ seconds: 90, speedMps: 3, acc: 5 })];
    const acc = new TrackAccumulator('Run');
    const live = new RouteSegments();
    for (const p of pts) live.add(p, acc.add(p));
    live.attachTail(acc.tailPoint());
    expect(live.drawn()).toEqual(routeSegments('Run', pts));
  });

  it('a straight real run still produces a continuous line', () => {
    const runs = routeSegments('Run', line({ seconds: 120, speedMps: 3, acc: 5 }));
    expect(runs).toHaveLength(1);
    expect(runs[0].length).toBeGreaterThan(10);
  });
});
