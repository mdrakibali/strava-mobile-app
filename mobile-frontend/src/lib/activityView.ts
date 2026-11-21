/**
 * Single mapping layer from backend payloads to what screens render.
 * Replaces four ad-hoc mappers that invented defaults (technical audit MET-03, FE-03).
 * Rule: missing data stays null — screens render "–" or hide the section.
 */
import { haversineM } from '../tracking/shared';
import { ActivityVisibility, SportType } from '../types';

export type LngLat = [number, number];

export interface AthleteSummary {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl: string | null;
  city: string | null;
  country?: string | null;
}

export interface SplitView {
  index: number;
  pace: string | null;
  elevationDeltaMeters: number | null;
}

/** A refetch that lost the comment list must not replace comments the screen already has. */
export function mergeCommentLists(current: CommentView[], incoming: CommentView[], serverCount: number): CommentView[] {
  if (incoming.length === 0 && current.length > 0 && serverCount > 0) return current;
  if (incoming.length === 0) return serverCount === 0 ? [] : current;
  const seen = new Set(incoming.map((c) => c.id));
  const kept = current.filter((c) => !seen.has(c.id) && (c.id.startsWith('local_') || !incoming.some((n) => n.content === c.content && n.author.id === c.author.id)));
  return [...incoming, ...kept].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export interface CommentView {
  id: string;
  content: string;
  createdAt: string;
  /** Set when the author edited it. */
  updatedAt?: string | null;
  author: AthleteSummary;
}

export interface ActivityView {
  id: string;
  athlete: AthleteSummary;
  title: string;
  description: string | null;
  sportType: SportType;
  visibility: ActivityVisibility;
  startTime: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number | null;
  elevationGainMeters: number | null;
  averageSpeedMps: number | null;
  maxSpeedMps: number | null;
  calories: number | null;
  route: LngLat[];
  elevationProfile: number[];
  splits: SplitView[];
  kudosCount: number;
  /** null = unknown (feed API does not report it). */
  hasKudos: boolean | null;
  commentsCount: number;
  comments: CommentView[];
}

/** Every new account gets this same stock photo from the backend; treat it as "no photo". */
const PLACEHOLDER_AVATAR_FRAGMENT = 'photo-1534528741775-53994a69daeb';

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return isFinite(n) ? n : null;
};

export const toAthleteSummary = (a: any): AthleteSummary => ({
  id: String(a?.id ?? ''),
  displayName: a?.displayName || a?.username || 'Athlete',
  username: a?.username,
  avatarUrl:
    a?.avatarUrl && !String(a.avatarUrl).includes(PLACEHOLDER_AVATAR_FRAGMENT) ? a.avatarUrl : null,
  city: a?.city || null,
  country: a?.country || null,
});

/** Accepts [{latitude, longitude}] or [[lng, lat]] and returns [lng, lat][]. Drops invalid points. */
export const toRoute = (points: unknown): LngLat[] => {
  if (!Array.isArray(points)) return [];
  const out: LngLat[] = [];
  for (const p of points as any[]) {
    let lng: number | null = null;
    let lat: number | null = null;
    if (Array.isArray(p)) {
      lng = num(p[0]);
      lat = num(p[1]);
    } else if (p && typeof p === 'object') {
      lng = num(p.longitude ?? p.lng);
      lat = num(p.latitude ?? p.lat);
    }
    if (lng !== null && lat !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) out.push([lng, lat]);
  }
  return out;
};

/**
 * Drop vertices that are just GPS wander around the previous kept point.
 * A recording made while standing still collapses to a single point, so the map draws no line.
 * Real movement is kept at about 12 m resolution.
 */
export const displayRoute = (points: LngLat[], minStepM = 12): LngLat[] => {
  if (points.length < 2) return points;
  const kept: LngLat[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = kept[kept.length - 1];
    const d = haversineM(prev[1], prev[0], points[i][1], points[i][0]);
    if (d >= minStepM) kept.push(points[i]);
  }
  return kept.length > 1 ? kept : [points[0]];
};

const toSplits = (splits: unknown): SplitView[] => {
  if (!Array.isArray(splits)) return [];
  return (splits as any[]).map((s, i) => ({
    index: num(s?.splitNumber) ?? i + 1,
    pace: typeof s?.paceFormatted === 'string' ? s.paceFormatted.replace(/\s*\/km$/, '') : null,
    elevationDeltaMeters: num(s?.elevationDeltaMeters),
  }));
};

const toElevation = (profile: unknown): number[] =>
  Array.isArray(profile) ? (profile as unknown[]).map(num).filter((n): n is number => n !== null) : [];

const base = (row: any, athlete: AthleteSummary): ActivityView => ({
  id: String(row.id),
  athlete,
  title: row.title || 'Activity',
  description: row.description || null,
  sportType: row.sportType || 'Run',
  visibility: row.visibility || 'PUBLIC',
  startTime: row.startTime,
  distanceMeters: num(row.distanceMeters) ?? 0,
  movingTimeSeconds: num(row.movingTimeSeconds) ?? 0,
  elapsedTimeSeconds: num(row.elapsedTimeSeconds),
  elevationGainMeters: num(row.elevationGainMeters),
  averageSpeedMps: num(row.averageSpeedMps),
  maxSpeedMps: num(row.maxSpeedMps),
  calories: num(row.calories),
  route: [],
  elevationProfile: toElevation(row.elevationProfile),
  splits: toSplits(row.splits),
  kudosCount: 0,
  hasKudos: null,
  commentsCount: 0,
  comments: [],
});

/** GET /feed item. */
export const fromFeedItem = (item: any): ActivityView => ({
  ...base(item, toAthleteSummary(item.athlete)),
  route: displayRoute(toRoute(item.polyline)),
  kudosCount: num(item.kudosCount) ?? 0,
  // Current servers report the viewer's kudos state; very old ones didn't send the field.
  hasKudos: typeof item.hasKudos === 'boolean' ? item.hasKudos : null,
  commentsCount: num(item.commentsCount) ?? 0,
});

/** GET /activities/:id response ({ activity, athlete, kudosCount, hasKudos, comments, ... }). */
export const fromDetailResponse = (res: any): ActivityView => {
  const row = res.activity;
  return {
    ...base(row, toAthleteSummary(res.athlete)),
    route: displayRoute(toRoute(row.rawPolyline?.length ? row.rawPolyline : row.maskedPolyline)),
    kudosCount: num(res.kudosCount) ?? 0,
    hasKudos: res.hasKudos === true || res.hasKudos === false ? res.hasKudos : null,
    commentsCount: num(res.commentsCount) ?? (Array.isArray(res.comments) ? res.comments.length : 0),
    comments: Array.isArray(res.comments)
      ? res.comments.map((c: any) => ({
          id: String(c.id),
          content: c.content,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt ?? null,
          author: toAthleteSummary(c.author),
        }))
      : [],
  };
};

/**
 * GET /athletes/:id → recentActivities and GET /athletes/:id/activities items (summary + masked
 * `polyline` + counts). Older servers returned full rows (maskedPolyline/rawPolyline), still accepted.
 */
export const fromProfileActivity = (row: any, athlete: AthleteSummary): ActivityView => ({
  ...base(row, athlete),
  route: displayRoute(toRoute(row.polyline?.length ? row.polyline : row.maskedPolyline?.length ? row.maskedPolyline : row.rawPolyline)),
  kudosCount: num(row.kudosCount) ?? 0,
  hasKudos: row.hasKudos === true || row.hasKudos === false ? row.hasKudos : null,
  commentsCount: num(row.commentsCount) ?? 0,
});

/** Avg speed with fallback to distance / moving time (never a hard-coded default). */
export const avgSpeedOf = (a: Pick<ActivityView, 'averageSpeedMps' | 'distanceMeters' | 'movingTimeSeconds'>) =>
  a.averageSpeedMps ?? (a.movingTimeSeconds > 0 ? a.distanceMeters / a.movingTimeSeconds : null);
