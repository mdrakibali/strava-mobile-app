import { previewLayout, project, thin, worldSize } from '../mercator';

describe('mercator', () => {
  it('projects known points', () => {
    expect(project([0, 0], 0)).toEqual([128, 128]);
    const [x, y] = project([-180, 85.05112878], 1);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 3);
    expect(worldSize(3)).toBe(2048);
  });

  it('fits a 2 km route into a feed-sized box and keeps every point inside the padding', () => {
    // ~2 km east-west in Dhaka
    const route: [number, number][] = Array.from({ length: 50 }, (_, i) => [90.4 + i * 0.0004, 23.78 + Math.sin(i / 8) * 0.002]);
    const L = previewLayout(route, 360, 200, { padding: 24 })!;
    expect(L.zoom).toBeGreaterThanOrEqual(13);
    expect(L.zoom).toBeLessThanOrEqual(15);
    for (const [x, y] of L.points) {
      expect(x).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(x).toBeLessThanOrEqual(336 + 1e-6);
      expect(y).toBeGreaterThanOrEqual(24 - 1e-6);
      expect(y).toBeLessThanOrEqual(176 + 1e-6);
    }
    // tiles cover the whole box
    const lefts = L.tiles.map((t) => t.left);
    const tops = L.tiles.map((t) => t.top);
    expect(Math.min(...lefts)).toBeLessThanOrEqual(0);
    expect(Math.max(...lefts) + 256).toBeGreaterThanOrEqual(360);
    expect(Math.min(...tops)).toBeLessThanOrEqual(0);
    expect(Math.max(...tops) + 256).toBeGreaterThanOrEqual(200);
  });

  it('caps the zoom for tiny routes and returns null for unusable input', () => {
    const tiny: [number, number][] = [
      [90.4, 23.78],
      [90.40001, 23.78001],
    ];
    expect(previewLayout(tiny, 300, 200, { maxZoom: 16 })!.zoom).toBe(16);
    expect(previewLayout([[90.4, 23.78]], 300, 200)).toBeNull();
    expect(previewLayout(tiny, 0, 200)).toBeNull();
  });

  it('thins long routes but keeps both ends', () => {
    const pts = Array.from({ length: 1000 }, (_, i) => i);
    const t = thin(pts, 100);
    expect(t).toHaveLength(100);
    expect(t[0]).toBe(0);
    expect(t[99]).toBe(999);
  });
});
