/**
 * Shared tracking types. This folder is pure TypeScript (no React, Expo or Workers imports) and is
 * compiled into BOTH the mobile app (Metro) and the Cloudflare Worker (esbuild), so the live screen,
 * the save screen and the server compute identical numbers (ADR-04).
 */

export type TrackingSport = 'Run' | 'Walk' | 'Hike' | 'Ride';

/**
 * One raw location fix as delivered by the OS. Stored verbatim on the device and uploaded verbatim;
 * filtering is a pure function of this data so it can be re-run on the server.
 */
export interface RawPoint {
  /** Fix time, epoch ms (from the location provider, not Date.now()). */
  t: number;
  lat: number;
  lng: number;
  /** Horizontal accuracy (m), 68% radius. null when the provider did not report it. */
  acc: number | null;
  /** Altitude (m, WGS84 ellipsoid on Android). Only deltas are used. */
  alt: number | null;
  /** Vertical accuracy (m). */
  altAcc: number | null;
  /** Doppler speed (m/s) from the provider. Much more robust than position deltas when slow. */
  speed: number | null;
  /** Recording segment: 0 for the first, +1 after every resume. Distance never bridges segments. */
  seg: number;
}

/** Compact wire format for uploads: [t, lat, lng, acc, alt, altAcc, speed, seg]. */
export type WirePoint = [number, number, number, number | null, number | null, number | null, number | null, number];

export const toWire = (p: RawPoint): WirePoint => [p.t, p.lat, p.lng, p.acc, p.alt, p.altAcc, p.speed, p.seg];

export const fromWire = (w: WirePoint): RawPoint => ({
  t: w[0],
  lat: w[1],
  lng: w[2],
  acc: w[3],
  alt: w[4],
  altAcc: w[5],
  speed: w[6],
  seg: w[7],
});

/** A [start, end] wall-clock interval (ms). end is null while the pause is still open. */
export type PauseInterval = [number, number | null];

export interface Split {
  /** 1-based index. */
  index: number;
  /** Split distance (m): 1000 for full splits, less for the final partial split. */
  distanceM: number;
  movingTimeS: number;
  elapsedTimeS: number;
  avgSpeedMps: number | null;
  /** Elevation difference across the split (m), null when elevation is unreliable. */
  elevDiffM: number | null;
}

export interface TrackSummary {
  distanceM: number;
  movingTimeS: number;
  /** Wall clock from start to finish, pauses included (Strava's definition, research §4). */
  elapsedTimeS: number;
  /** Elapsed minus manual pauses: what the recorder's timer shows. */
  activeTimeS: number;
  avgSpeedMps: number | null;
  maxSpeedMps: number | null;
  /** null when altitude data is too sparse or too inaccurate to report a gain honestly. */
  elevGainM: number | null;
  elevHighM: number | null;
  elevLowM: number | null;
  splits: Split[];
  pointCount: number;
  acceptedCount: number;
}
