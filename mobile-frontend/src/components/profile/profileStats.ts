import { ActivityView } from '../../lib/activityView';
import { AthleteStats } from '../../services/api';

export const RECENT_LIMIT = 10;
export const WEEK_MS = 7 * 24 * 3600 * 1000;

export const startOfWeek = (d: Date) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
};

export const computeProgress = (
  activities: ActivityView[],
  stats: AthleteStats | null,
  sportFilter: string
) => {
  const match = (sport: string) => sportFilter === 'All' || sport === sportFilter;
  if (stats) {
    const weeks = stats.weeks.map((w) => {
      let meters = 0, seconds = 0, elev = 0;
      for (const [sport, v] of Object.entries(w.bySport)) {
        if (!match(sport)) continue;
        meters += v.distance;
        seconds += v.moving;
        elev += v.elevation;
      }
      return { start: new Date(w.weekStart).getTime(), meters, seconds, elev };
    });
    const cur = weeks[weeks.length - 1];
    return { week: { meters: cur.meters, seconds: cur.seconds, elev: cur.elev }, weeks, weekComplete: true, windowComplete: true };
  }
  const list = activities.filter((a) => match(a.sportType));
  const thisWeekStart = startOfWeek(new Date()).getTime();
  const windowStart = thisWeekStart - 11 * WEEK_MS;
  const weeks = Array.from({ length: 12 }, (_, i) => ({ start: windowStart + i * WEEK_MS, meters: 0, seconds: 0, elev: 0 }));
  let week = { meters: 0, seconds: 0, elev: 0 };
  for (const a of list) {
    const t = new Date(a.startTime).getTime();
    if (t >= thisWeekStart) {
      week = { meters: week.meters + a.distanceMeters, seconds: week.seconds + a.movingTimeSeconds, elev: week.elev + (a.elevationGainMeters ?? 0) };
    }
    const idx = Math.floor((t - windowStart) / WEEK_MS);
    if (idx >= 0 && idx < 12) weeks[idx].meters += a.distanceMeters;
  }
  const truncated = activities.length >= RECENT_LIMIT;
  return { week, weeks, weekComplete: !truncated, windowComplete: !truncated };
};

export const computeTotals = (stats: AthleteStats | null, sportFilter: string) => {
  if (!stats) return null;
  const rows = stats.bySport.filter((b) => sportFilter === 'All' || b.sportType === sportFilter);
  const sum = (k: 'yearToDate' | 'allTime') =>
    rows.reduce(
      (acc, r) => ({
        count: acc.count + r[k].count,
        distanceMeters: acc.distanceMeters + r[k].distanceMeters,
        movingTimeSeconds: acc.movingTimeSeconds + r[k].movingTimeSeconds,
        elevationGainMeters: acc.elevationGainMeters + r[k].elevationGainMeters,
      }),
      { count: 0, distanceMeters: 0, movingTimeSeconds: 0, elevationGainMeters: 0 }
    );
  return { ytd: sum('yearToDate'), all: sum('allTime') };
};

