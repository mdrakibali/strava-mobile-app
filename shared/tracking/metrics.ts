import { FilterResult, PointFilter } from './filter';
import { haversineM } from './geo';
import { ENGINE, TrackingConfig, trackingConfig } from './sports';
import { PauseInterval, RawPoint, Split, TrackSummary } from './types';

const SPLIT_M = 1000;
/** A trailing partial split shorter than this is noise, not a split. */
const MIN_PARTIAL_SPLIT_M = 10;

interface SplitAnchor {
  d: number;
  movingMs: number;
  t: number;
  alt: number | null;
}

/**
 * Incremental track metrics. The live recorder feeds points one by one; `summarizeTrack` feeds a
 * whole stored track through the same class, so live == batch == server by construction.
 */
export class TrackAccumulator {
  readonly cfg: TrackingConfig;
  private readonly filter: PointFilter;

  distanceM = 0;
  movingMs = 0;
  maxSpeedMps = 0;
  pointCount = 0;
  acceptedCount = 0;
  lastAccepted: RawPoint | null = null;
  readonly splits: Split[] = [];

  // distance anchor (only advances once the athlete clearly moved — the jitter gate)
  private anchor: RawPoint | null = null;
  private anchorMovingMs = 0;
  // cumulative-distance samples for the smoothed speed (current run of track only)
  private window: { t: number; d: number }[] = [];
  private windowSpeed: number | null = null;
  // elevation
  private altBuf: number[] = [];
  private altSamples = 0;
  private smoothedAlt: number | null = null;
  private elevMode: 'unknown' | 'up' | 'down' = 'unknown';
  private elevLo = 0;
  private elevHi = 0;
  private gain = 0;
  private elevHigh: number | null = null;
  private elevLow: number | null = null;
  // splits
  private splitStart: SplitAnchor | null = null;

  constructor(sport: string) {
    this.cfg = trackingConfig(sport);
    this.filter = new PointFilter(this.cfg);
  }

  add(p: RawPoint): FilterResult {
    this.pointCount++;
    const r = this.filter.push(p);
    if (!r.accepted) return r;
    this.acceptedCount++;
    this.updateElevation(p);

    const prev = this.lastAccepted;
    this.lastAccepted = p;
    if (!this.splitStart) this.splitStart = { d: 0, movingMs: 0, t: p.t, alt: this.smoothedAlt };

    if (r.gapBefore || !prev) {
      this.anchor = p;
      this.anchorMovingMs = this.movingMs;
      this.window = [{ t: p.t, d: this.distanceM }];
      this.windowSpeed = null;
      return r;
    }

    // ---- distance (jitter-gated) ----
    const anchor = this.anchor!;
    const d = haversineM(anchor.lat, anchor.lng, p.lat, p.lng);
    const maxAcc = Math.max(anchor.acc ?? 0, p.acc ?? 0);
    let gate: number;
    if (p.speed != null && p.speed >= 0) {
      // Doppler speed is available (almost all Android fixes): trust it to tell moving from resting.
      if (p.speed >= this.cfg.minMovingSpeedMps) gate = 1;
      else if (p.speed < this.cfg.minMovingSpeedMps / 2) gate = Infinity; // stationary: hold the anchor
      else gate = Math.max(ENGINE.minStepM, 0.5 * maxAcc);
    } else {
      // Position-only: the athlete must clearly leave the accuracy circle before distance counts.
      gate = Math.max(ENGINE.minStepM, maxAcc);
    }
    let advanced = false;
    const distBefore = this.distanceM;
    if (d >= gate) {
      this.distanceM += d;
      advanced = true;
    }

    // ---- smoothed speed over the window ----
    this.window.push({ t: p.t, d: this.distanceM });
    while (this.window.length > 2 && p.t - this.window[1].t >= ENGINE.speedWindowMs) this.window.shift();
    const w0 = this.window[0];
    const span = p.t - w0.t;
    this.windowSpeed = span >= 3000 ? (this.distanceM - w0.d) / (span / 1000) : null;

    // ---- moving time ----
    const dt = p.t - prev.t;
    const v = p.speed != null && p.speed >= 0 ? p.speed : (this.windowSpeed ?? 0);
    if (dt <= ENGINE.maxMovingGapMs && v >= this.cfg.minMovingSpeedMps) this.movingMs += dt;

    // ---- max speed (smoothed, so one noisy fix can't set it) ----
    if (this.windowSpeed != null && span >= 5000) {
      this.maxSpeedMps = Math.max(this.maxSpeedMps, Math.min(this.windowSpeed, this.cfg.maxSpeedMps));
    }

    // ---- splits (interpolated boundary crossings) ----
    if (advanced) {
      const step = this.distanceM - distBefore;
      while (this.distanceM >= (this.splits.length + 1) * SPLIT_M) {
        const boundary = (this.splits.length + 1) * SPLIT_M;
        const f = step > 0 ? (boundary - distBefore) / step : 1;
        const tCross = anchor.t + f * (p.t - anchor.t);
        const movingCross = this.anchorMovingMs + f * (this.movingMs - this.anchorMovingMs);
        this.pushSplit(boundary, movingCross, tCross, SPLIT_M);
      }
      this.anchor = p;
      this.anchorMovingMs = this.movingMs;
    }
    return r;
  }

  private pushSplit(atDistance: number, movingMs: number, t: number, distanceM: number) {
    const s = this.splitStart!;
    const movingTimeS = Math.round((movingMs - s.movingMs) / 1000);
    this.splits.push({
      index: this.splits.length + 1,
      distanceM: Math.round(distanceM * 10) / 10,
      movingTimeS,
      elapsedTimeS: Math.round((t - s.t) / 1000),
      avgSpeedMps: movingTimeS > 0 ? distanceM / movingTimeS : null,
      elevDiffM:
        this.smoothedAlt != null && s.alt != null && this.elevationReliable()
          ? Math.round(this.smoothedAlt - s.alt)
          : null,
    });
    this.splitStart = { d: atDistance, movingMs, t, alt: this.smoothedAlt };
  }

  private updateElevation(p: RawPoint) {
    if (p.alt == null || !Number.isFinite(p.alt)) return;
    if (p.altAcc != null && p.altAcc > ENGINE.maxAltitudeAccuracyM) return;
    this.altSamples++;
    this.altBuf.push(p.alt);
    if (this.altBuf.length > ENGINE.altitudeSmoothingPoints) this.altBuf.shift();
    const s = this.altBuf.reduce((a, b) => a + b, 0) / this.altBuf.length;
    this.smoothedAlt = s;
    this.elevHigh = this.elevHigh == null ? s : Math.max(this.elevHigh, s);
    this.elevLow = this.elevLow == null ? s : Math.min(this.elevLow, s);

    // Hysteresis: a climb only counts once it exceeds H from the preceding low; it then counts in
    // full (from that low). Noise smaller than H never accumulates.
    const H = ENGINE.elevationHysteresisM;
    if (this.altSamples === 1) {
      this.elevLo = this.elevHi = s;
      return;
    }
    if (this.elevMode === 'up') {
      if (s > this.elevHi) {
        this.gain += s - this.elevHi;
        this.elevHi = s;
      } else if (this.elevHi - s >= H) {
        this.elevMode = 'down';
        this.elevLo = s;
      }
    } else {
      this.elevLo = Math.min(this.elevLo, s);
      this.elevHi = Math.max(this.elevHi, s);
      if (s - this.elevLo >= H) {
        this.gain += s - this.elevLo;
        this.elevMode = 'up';
        this.elevHi = s;
      } else if (this.elevMode === 'unknown' && this.elevHi - s >= H) {
        this.elevMode = 'down';
        this.elevLo = s;
      }
    }
  }

  private elevationReliable() {
    return (
      this.altSamples >= ENGINE.minAltitudeSamples &&
      this.acceptedCount > 0 &&
      this.altSamples / this.acceptedCount >= ENGINE.minAltitudeCoverage
    );
  }

  get elevationGainM(): number | null {
    return this.elevationReliable() ? Math.round(this.gain) : null;
  }

  /** Smoothed speed for the live display. Device (Doppler) speed when fresh, else the window speed. */
  currentSpeedMps(now: number): number {
    const p = this.lastAccepted;
    if (!p || now - p.t > 5000) return 0;
    if (p.speed != null && p.speed >= 0) return p.speed < this.cfg.minMovingSpeedMps / 2 ? 0 : p.speed;
    return this.windowSpeed ?? 0;
  }

  summary(session: { startedAt: number; finishedAt: number | null; pauses: PauseInterval[]; now?: number }): TrackSummary {
    const end = session.finishedAt ?? session.now ?? Date.now();
    const elapsedMs = Math.max(0, end - session.startedAt);
    const pausedMs = totalPausedMs(session.pauses, end);
    const splits = [...this.splits];
    const s = this.splitStart;
    const remaining = s ? this.distanceM - s.d : 0;
    if (s && this.lastAccepted && remaining >= MIN_PARTIAL_SPLIT_M) {
      const movingTimeS = Math.round((this.movingMs - s.movingMs) / 1000);
      splits.push({
        index: splits.length + 1,
        distanceM: Math.round(remaining * 10) / 10,
        movingTimeS,
        elapsedTimeS: Math.round((this.lastAccepted.t - s.t) / 1000),
        avgSpeedMps: movingTimeS > 0 ? remaining / movingTimeS : null,
        elevDiffM:
          this.smoothedAlt != null && s.alt != null && this.elevationReliable()
            ? Math.round(this.smoothedAlt - s.alt)
            : null,
      });
    }
    const movingTimeS = Math.round(this.movingMs / 1000);
    const distanceM = Math.round(this.distanceM * 10) / 10;
    const reliable = this.elevationReliable();
    return {
      distanceM,
      movingTimeS,
      elapsedTimeS: Math.round(elapsedMs / 1000),
      activeTimeS: Math.round(Math.max(0, elapsedMs - pausedMs) / 1000),
      avgSpeedMps: movingTimeS > 0 && distanceM > 0 ? distanceM / movingTimeS : null,
      maxSpeedMps: this.maxSpeedMps > 0 ? Math.round(this.maxSpeedMps * 100) / 100 : null,
      elevGainM: reliable ? Math.round(this.gain) : null,
      elevHighM: reliable && this.elevHigh != null ? Math.round(this.elevHigh) : null,
      elevLowM: reliable && this.elevLow != null ? Math.round(this.elevLow) : null,
      splits,
      pointCount: this.pointCount,
      acceptedCount: this.acceptedCount,
    };
  }
}

export const totalPausedMs = (pauses: PauseInterval[], now: number) =>
  pauses.reduce((sum, [start, end]) => sum + Math.max(0, (end ?? now) - start), 0);

export interface TrackInput {
  sport: string;
  points: RawPoint[];
  startedAt: number;
  finishedAt: number | null;
  pauses: PauseInterval[];
  now?: number;
}

/** Batch computation over a full track (save screen, server recompute). */
export const summarizeTrack = (input: TrackInput): TrackSummary => {
  const acc = new TrackAccumulator(input.sport);
  for (const p of input.points) acc.add(p);
  return acc.summary(input);
};

/** Points that pass the filter, in order (what we store and draw as the route). */
export const acceptedPoints = (sport: string, points: RawPoint[]): RawPoint[] => {
  const f = new PointFilter(trackingConfig(sport));
  return points.filter((p) => f.push(p).accepted);
};

/** Pace (s/km) from a speed, or null when the athlete is effectively stationary. */
export const paceSecPerKm = (speedMps: number | null | undefined, minSpeedMps = 0.3): number | null =>
  speedMps != null && Number.isFinite(speedMps) && speedMps >= minSpeedMps ? 1000 / speedMps : null;
