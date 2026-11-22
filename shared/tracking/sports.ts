import { TrackingSport } from './types';

/**
 * Per-sport tracking parameters. These are OUR engineering choices — Strava does not publish its
 * thresholds (research §4, §8). Tune them against recorded fixtures (implementation plan T-1/T-2).
 */
export interface TrackingConfig {
  /** Below this speed the athlete counts as resting (moving time excludes it). */
  minMovingSpeedMps: number;
  /** Implied speed above this between two fixes is physically implausible → the fix is a GPS spike. */
  maxSpeedMps: number;
  /** Fixes less accurate than this (68% radius) are dropped. */
  maxAccuracyM: number;
}

export const TRACKING_CONFIG: Record<TrackingSport, TrackingConfig> = {
  // Run keeps 30 m to allow chip warm-up while rejecting indoor wander.
  Run: { minMovingSpeedMps: 0.9, maxSpeedMps: 12, maxAccuracyM: 30 },
  // Walk/Hike raised to 65 m: walking workouts frequently start indoors or in stairwells
  // where GPS signal degrades before clearing the building.
  Walk: { minMovingSpeedMps: 0.4, maxSpeedMps: 5, maxAccuracyM: 65 },
  Hike: { minMovingSpeedMps: 0.3, maxSpeedMps: 5, maxAccuracyM: 65 },
  Ride: { minMovingSpeedMps: 1.0, maxSpeedMps: 30, maxAccuracyM: 25 },
};

export const trackingConfig = (sport: string): TrackingConfig =>
  TRACKING_CONFIG[sport as TrackingSport] ??
  (/ride|bike/i.test(sport) ? TRACKING_CONFIG.Ride : TRACKING_CONFIG.Run);

export const isTrackingSport = (s: unknown): s is TrackingSport =>
  s === 'Run' || s === 'Walk' || s === 'Hike' || s === 'Ride';

/** Shared engine constants. */
export const ENGINE = {
  /** Δt larger than this between fixes is a GPS gap: it never counts as moving time. */
  maxMovingGapMs: 10_000,
  /** Window used for the smoothed current speed and for max speed. */
  speedWindowMs: 10_000,
  /** Minimum step (m) before the distance anchor advances (stationary jitter gate). */
  minStepM: 2,
  /** After this long of continuous "impossible speed" rejections, accept a new anchor (tunnel exit). */
  spikeResetMs: 10_000,
  /** Altitude fixes worse than this are ignored for elevation. */
  maxAltitudeAccuracyM: 10,
  /** Moving-average window for altitude. */
  altitudeSmoothingPoints: 5,
  /** Climb must exceed this to count (Strava's documented non-barometric threshold, research §6). */
  elevationHysteresisM: 10,
  /** Elevation is reported only when at least this share of accepted fixes has usable altitude. */
  minAltitudeCoverage: 0.5,
  minAltitudeSamples: 10,
} as const;
