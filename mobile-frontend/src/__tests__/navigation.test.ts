/**
 * Navigation integrity: every route the app navigates to must resolve to a screen file under
 * src/app (Expo Router), and the bottom bar must have the five tabs Home · Maps · Workout ·
 * Groups · You.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = join(__dirname, '..');
const APP = join(SRC, 'app');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === '__tests__' ? [] : walk(p);
    return /\.(tsx?|jsx?)$/.test(f) ? [p] : [];
  });

/** Route patterns from files: '(tabs)/index.tsx' → '/', 'activity/[id].tsx' → '/activity/[id]'. */
const routePatterns = walk(APP)
  .map((f) => relative(APP, f).replace(/\.(tsx?|jsx?)$/, ''))
  .filter((r) => !r.split('/').some((seg) => seg.startsWith('_')))
  .map(
    (r) =>
      '/' +
      r
        .split('/')
        .filter((seg) => !/^\(.*\)$/.test(seg))
        .join('/')
        .replace(/(^|\/)index$/, '')
  )
  .map((r) => (r === '/' ? '/' : r.replace(/\/$/, '')));

const matches = (target: string) => {
  // Group segments like /(tabs) are valid in hrefs and don't change the URL.
  const clean =
    target
      .split('?')[0]
      .replace(/\/\([^)]+\)/g, '')
      .replace(/\/$/, '') || '/';
  return routePatterns.some((pattern) => {
    const re = new RegExp('^' + pattern.replace(/\[[^\]]+\]/g, '[^/]+') + '$');
    return pattern === clean || re.test(clean);
  });
};

const sources = walk(SRC).filter((f) => !f.includes('__tests__'));

describe('navigation', () => {
  it('every router.push/replace/navigate target and pathname resolves to a screen', () => {
    const missing: string[] = [];
    for (const file of sources) {
      const text = readFileSync(file, 'utf8');
      const targets = [
        ...text.matchAll(/router\.(?:push|replace|navigate)\(\s*'([^']+)'/g),
        ...text.matchAll(/pathname:\s*'([^']+)'/g),
      ].map((m) => m[1]);
      for (const t of targets)
        if (t.startsWith('/') && !matches(t)) missing.push(`${relative(SRC, file)} → ${t}`);
    }
    expect(missing).toEqual([]);
  });

  it('has the five bottom tabs in order: Home, Maps, Workout, Groups, You', () => {
    const layout = readFileSync(join(APP, '(tabs)', '_layout.tsx'), 'utf8');
    const titles = [...layout.matchAll(/title: '([^']+)'/g)].map((m) => m[1]);
    expect(titles).toEqual(['Home', 'Maps', 'Workout', 'Groups', 'You']);
    for (const f of ['index', 'maps', 'workout', 'groups', 'profile']) {
      expect(() => statSync(join(APP, '(tabs)', `${f}.tsx`))).not.toThrow();
    }
  });

  it('secondary screens added for social features exist', () => {
    for (const r of [
      '/activity/kudos/abc',
      '/activity/edit/abc',
      '/history/abc',
      '/athlete/followers',
      '/athlete/following',
      '/settings/gps',
      '/routes/plan',
      '/routes/builder',
    ]) {
      expect([r, matches(r)]).toEqual([r, true]);
    }
  });
});

describe('planned vs recorded routes', () => {
  it('the recording engine, background task and sync never read the planned route', () => {
    for (const f of [
      'tracking/engine.ts',
      'tracking/locationTask.ts',
      'tracking/sync.ts',
      'tracking/db.ts',
    ]) {
      const text = readFileSync(join(SRC, f), 'utf8');
      expect([f, /plannedRoute/i.test(text)]).toEqual([f, false]);
    }
  });
});
