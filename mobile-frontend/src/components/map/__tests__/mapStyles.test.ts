import { DEFAULT_MAP_STYLE, MAP_STYLES, MAP_STYLE_OPTIONS, toMapStyleKey } from '../mapTypes';

describe('map style configuration', () => {
  it('defaults to OpenFreeMap Positron', () => {
    expect(DEFAULT_MAP_STYLE).toBe('positron');
    expect(MAP_STYLES.positron).toBe('https://tiles.openfreemap.org/styles/positron');
  });
  it('offers Positron, Bright and Voyager only (no 3D Liberty)', () => {
    expect(Object.keys(MAP_STYLES).sort()).toEqual(['bright', 'positron', 'voyager']);
    expect(MAP_STYLE_OPTIONS.map((o) => o.id).sort()).toEqual(['bright', 'positron', 'voyager']);
    expect(JSON.stringify(MAP_STYLES)).not.toMatch(/liberty/);
  });
  it('maps legacy or unknown keys to the default', () => {
    expect(toMapStyleKey('liberty')).toBe('positron');
    expect(toMapStyleKey(undefined)).toBe('positron');
    expect(toMapStyleKey('voyager')).toBe('voyager');
    expect(toMapStyleKey('toString')).toBe('positron');
  });
});
