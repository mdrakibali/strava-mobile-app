/**
 * Display formatting. Values are stored in SI units (m, s, m/s); conversion happens only here.
 * Rules: docs/STRAVA_SCREEN_DESIGN_PLAN.md §5. "–" means "no data" (never a placeholder number).
 */

export const DASH = '–';

const pad = (n: number) => String(n).padStart(2, '0');

/** 5.02 (km) — 2 decimals below 100 km, 1 decimal above. Returns number string without unit. */
export const kmValue = (meters: number | null | undefined) => {
  if (meters == null || !isFinite(meters)) return DASH;
  const km = meters / 1000;
  return km >= 100 ? km.toFixed(1) : km.toFixed(2);
};

export const formatDistance = (meters: number | null | undefined) =>
  meters == null || !isFinite(meters) ? DASH : `${kmValue(meters)} km`;

/** Clock style: 28:33 or 1:05:12. `alwaysHours` → 00:28:33 (recorder stats view). */
export const formatClock = (totalSeconds: number | null | undefined, alwaysHours = false) => {
  if (totalSeconds == null || !isFinite(totalSeconds) || totalSeconds < 0) return DASH;
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0 || alwaysHours) return `${alwaysHours ? pad(h) : h}:${pad(m)}:${pad(sec)}`;
  return `${pad(m)}:${pad(sec)}`;
};

/** Compact duration for summaries: 42m 9s · 1h 5m · 18s. */
export const formatDuration = (totalSeconds: number | null | undefined) => {
  if (totalSeconds == null || !isFinite(totalSeconds) || totalSeconds < 0) return DASH;
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

/** Pace mm:ss per km from distance + time. Needs ≥ 50 m to be meaningful. Returns value without unit. */
export const paceValue = (meters: number | null | undefined, seconds: number | null | undefined) => {
  if (!meters || !seconds || meters < 50 || seconds <= 0) return DASH;
  const secPerKm = Math.round(seconds / (meters / 1000));
  if (!isFinite(secPerKm) || secPerKm > 99 * 60) return DASH;
  return `${Math.floor(secPerKm / 60)}:${pad(secPerKm % 60)}`;
};

export const formatPace = (meters: number | null | undefined, seconds: number | null | undefined) => {
  const v = paceValue(meters, seconds);
  return v === DASH ? DASH : `${v} /km`;
};

/** km/h with one decimal, value only. */
export const speedValue = (mps: number | null | undefined) =>
  mps == null || !isFinite(mps) || mps < 0 ? DASH : (mps * 3.6).toFixed(1);

export const formatSpeed = (mps: number | null | undefined) => {
  const v = speedValue(mps);
  return v === DASH ? DASH : `${v} km/h`;
};

export const formatElevation = (meters: number | null | undefined) =>
  meters == null || !isFinite(meters) ? DASH : `${Math.round(meters).toLocaleString()} m`;

export const formatCalories = (kcal: number | null | undefined) =>
  kcal == null || !isFinite(kcal) || kcal <= 0 ? DASH : `${Math.round(kcal).toLocaleString()} Cal`;

const timeOfDay = (d: Date) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Today at 6:42 AM" · "Yesterday at …" · "November 1, 2026 at …" (reference feed header). */
export const formatActivityDate = (iso: string | null | undefined, now = new Date()) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return `Today at ${timeOfDay(d)}`;
  if (sameDay(d, yesterday)) return `Yesterday at ${timeOfDay(d)}`;
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return `${date} at ${timeOfDay(d)}`;
};

/** Relative time for notifications: "5m", "3h", "2d", else date. */
export const formatRelative = (iso: string | null | undefined, now = new Date()) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (isNaN(diff)) return '';
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Default activity title: Morning (05–12) / Afternoon (12–17) / Evening (17–21) / Night + sport. */
export const defaultActivityTitle = (sportLabel: string, start: Date = new Date()) => {
  const h = start.getHours();
  const part = h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Afternoon' : h >= 17 && h < 21 ? 'Evening' : 'Night';
  return `${part} ${sportLabel}`;
};
