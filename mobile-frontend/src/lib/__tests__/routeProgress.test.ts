import { etaMinutes, routeProgress } from '../routeProgress';

// ~111 m per 0.001 deg latitude
const route: [number, number][] = [
  [90, 23],
  [90, 23.001],
  [90, 23.002],
  [90, 23.003],
];

describe('routeProgress', () => {
  it('is null without a fix or a route (no invented distance)', () => {
    expect(routeProgress(route, null)).toBeNull();
    expect(routeProgress([[90, 23]], [90, 23])).toBeNull();
  });
  it('measures remaining distance from the nearest vertex', () => {
    const start = routeProgress(route, [90, 23])!;
    expect(start.remainingMeters).toBeGreaterThan(330);
    expect(start.remainingMeters).toBeLessThan(336);
    expect(start.onRoute).toBe(true);
    const mid = routeProgress(route, [90, 23.002])!;
    expect(mid.remainingMeters).toBeGreaterThan(108);
    expect(mid.remainingMeters).toBeLessThan(114);
  });
  it('does not change while the user stands still on the route', () => {
    const a = routeProgress(route, [90, 23.001])!;
    const b = routeProgress(route, [90, 23.001])!;
    expect(a.remainingMeters).toBe(b.remainingMeters);
  });
  it('flags off-route beyond 50 m', () => {
    expect(routeProgress(route, [90.002, 23.001])!.onRoute).toBe(false);
  });
  it('eta needs real speed', () => {
    expect(etaMinutes(1000, 0)).toBeNull();
    expect(etaMinutes(1200, 2)).toBe(10);
  });
});
