import { athletes } from '../db/schema';
import { countOf, flagOf } from './counts';

type AthleteRow = typeof athletes.$inferSelect;

/** Public athlete DTO: whitelist, never spread a DB row into a response (PRIV-03, PRIV-05). */
export const toPublicAthlete = (a: AthleteRow) => ({
  id: a.id,
  username: a.username,
  displayName: a.displayName,
  avatarUrl: a.avatarUrl,
  city: a.city,
  country: a.country,
  bio: a.bio,
});

/** What the owner additionally sees about themselves. */
export const toPrivateAthlete = (a: AthleteRow) => ({
  ...toPublicAthlete(a),
  email: a.email,
  weightKg: a.weightKg != null ? Number(a.weightKg) : null,
});

/** Activity list item (history/profile): summary + masked route, never the raw track. */
export const toActivityListItem = (r: {
  id: string;
  title: string;
  description: string | null;
  sportType: string;
  visibility: string;
  startTime: Date;
  distanceMeters: string;
  movingTimeSeconds: number;
  elapsedTimeSeconds: number;
  elevationGainMeters: number;
  averageSpeedMps: string | null;
  maxSpeedMps: string | null;
  calories: number | null;
  maskedPolyline: unknown;
  kudosCount: number | string;
  commentsCount: number | string;
  hasKudos?: boolean;
}) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  sportType: r.sportType,
  visibility: r.visibility,
  startTime: r.startTime,
  distanceMeters: Number(r.distanceMeters),
  movingTimeSeconds: r.movingTimeSeconds,
  elapsedTimeSeconds: r.elapsedTimeSeconds,
  elevationGainMeters: r.elevationGainMeters,
  averageSpeedMps: r.averageSpeedMps != null ? Number(r.averageSpeedMps) : null,
  maxSpeedMps: r.maxSpeedMps != null ? Number(r.maxSpeedMps) : null,
  calories: r.calories,
  polyline: r.maskedPolyline ?? [],
  kudosCount: countOf(r.kudosCount),
  commentsCount: countOf(r.commentsCount),
  hasKudos: flagOf(r.hasKudos),
});
