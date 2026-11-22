import { DEFAULT_MAP_STYLE, MAP_STYLES, MAP_STYLE_OPTIONS, toMapStyleKey } from '../mapTypes';

describe('map style configuration', () => {
  it('defaults to outdoor style', () => {
    expect(DEFAULT_MAP_STYLE).toBe('outdoor');
    expect(MAP_STYLES.outdoor).toBeDefined();
    expect(MAP_STYLES.dark_topo).toBeDefined();
  });
  it('offers outdoor, dark_topo, positron, bright and voyager (no 3D Liberty)', () => {
    expect(Object.keys(MAP_STYLES).sort()).toEqual(['bright', 'dark_topo', 'outdoor', 'positron', 'voyager']);
    expect(MAP_STYLE_OPTIONS.map((o) => o.id).sort()).toEqual(['bright', 'dark_topo', 'outdoor', 'positron']);
    expect(JSON.stringify(MAP_STYLES)).not.toMatch(/liberty/);
  });
  it('maps legacy or unknown keys to the default', () => {
    expect(toMapStyleKey('liberty')).toBe('outdoor');
    expect(toMapStyleKey(undefined)).toBe('outdoor');
    expect(toMapStyleKey('voyager')).toBe('voyager');
    expect(toMapStyleKey('toString')).toBe('outdoor');
  });
});
