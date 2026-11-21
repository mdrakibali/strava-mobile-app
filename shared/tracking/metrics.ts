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
  /** Consecutive fixes that left the accuracy circle at a plausible speed, still getting farther, on a stable heading. */
  private departStreak = 0;
  private departDist = 0;
  private departBearing: number | null = null;
  /** Consecutive short steps on a stable heading. Used for moving time, not for drawing the route. */
  private hopStreak = 0;
  private hopBearing: number | null = null;
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

    if (prev && r.gapBefore) this.commitTail(prev);
    if (r.gapBefore || !prev) {
      this.anchor = p;
      this.anchorMovingMs = this.movingMs;
      this.window = [{ t: p.t, d: this.distanceM }];
      this.windowSpeed = null;
      this.departStreak = 0;
      this.departDist = 0;
      this.departBearing = null;
      this.hopStreak = 0;
      this.hopBearing = null;
      return r;
    }

    // ---- distance (jitter-gated) ----
    // Phone GPS wanders by several metres while the athlete is standing still, and the reported
    // speed is often a walking pace during that wander. Distance advances only when the athlete
    // keeps getting farther from the anchor, on a stable heading, outside the accuracy circle.
    const anchor = this.anchor!;
    const d = haversineM(anchor.lat, anchor.lng, p.lat, p.lng);
    const accRadius = Math.max(anchor.acc ?? 0, p.acc ?? 0);
    const dtSec = Math.max(0.001, (p.t - anchor.t) / 1000);
    const implied = d / dtSec;
    const doppler = p.speed != null && p.speed >= 0 ? p.speed : null;
    const gate = Math.max(ENGINE.minStepM, accRadius > 0 ? accRadius : 4);
    const inBand = implied >= this.cfg.minMovingSpeedMps && implied <= this.cfg.maxSpeedMps;
    const dopplerAgrees =
      doppler == null || (doppler >= this.cfg.minMovingSpeedMps * 0.5 && doppler <= this.cfg.maxSpeedMps);
    const leaving = d >= gate && inBand && dopplerAgrees;
    const bearing = bearingDeg(anchor.lat, anchor.lng, p.lat, p.lng);
    const turn = this.departBearing == null ? 0 : turnDeg(this.departBearing, bearing);
    const progressing = leaving && d >= this.departDist + 0.8 && turn <= 40;
    if (progressing) {
      this.departStreak++;
      this.departDist = d;
      this.departBearing = bearing;
    } else if (!leaving || d + 1 < this.departDist) {
      this.departStreak = 0;
      this.departDist = d;
      this.departBearing = leaving ? bearing : null;
    }

    let advanced = false;
    const distBefore = this.distanceM;
    if (progressing && this.departStreak >= 3) {
      this.distanceM += d;
      advanced = true;
    }

    // Moving time follows each short step, not the Doppler reading on its own. Three steps on
    // the same heading are a walk or ride; a wandering phone does not hold a heading.
    const hop = haversineM(prev.lat, prev.lng, p.lat, p.lng);
    const hopDt = p.t - prev.t;
    const hopSpeed = hopDt > 0 ? hop / (hopDt / 1000) : 0;
    const hopBand = hopSpeed >= this.cfg.minMovingSpeedMps && hopSpeed <= this.cfg.maxSpeedMps;
    const hopBearing = bearingDeg(prev.lat, prev.lng, p.lat, p.lng);
    const hopTurn = this.hopBearing == null ? 0 : turnDeg(this.hopBearing, hopBearing);
    if (hopBand && hopDt > 0 && hopDt <= ENGINE.maxMovingGapMs && hopTurn <= 35 && dopplerAgrees) {
      this.hopStreak++;
      this.hopBearing = hopBearing;
      if (this.hopStreak >= 2) this.movingMs += hopDt;
    } else {
      this.hopStreak = 0;
      this.hopBearing = null;
    }

    // ---- smoothed speed over the window ----
    this.window.push({ t: p.t, d: this.distanceM });
    while (this.window.length > 2 && p.t - this.window[1].t >= ENGINE.speedWindowMs) this.window.shift();
    const w0 = this.window[0];
    const span = p.t - w0.t;
    this.windowSpeed = span >= 3000 ? (this.distanceM - w0.d) / (span / 1000) : null;

    if (advanced) {
      const stepSpeed = Math.min(implied, this.cfg.maxSpeedMps);
      this.maxSpeedMps = Math.max(this.maxSpeedMps, stepSpeed);
    } else if (
      doppler != null &&
      this.windowSpeed != null &&
      this.windowSpeed >= this.cfg.minMovingSpeedMps * 0.5 &&
      doppler >= this.cfg.minMovingSpeedMps &&
      doppler <= this.cfg.maxSpeedMps
    ) {
      this.maxSpeedMps = Math.max(this.maxSpeedMps, doppler);
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
      this.departStreak = 0;
      this.departDist = 0;
      this.departBearing = null;
    }
    return advanced ? { ...r, moved: true } : r;
  }

  /** Distance still sitting between the anchor and the latest fix, when that step is real movement. */
  private pendingChord(to: RawPoint | null): { d: number; from: RawPoint; to: RawPoint } | null {
    const anchor = this.anchor;
    if (!anchor || !to || to === anchor || to.t <= anchor.t) return null;
    const d = haversineM(anchor.lat, anchor.lng, to.lat, to.lng);
    const accRadius = Math.max(anchor.acc ?? 0, to.acc ?? 0);
    const dtSec = (to.t - anchor.t) / 1000;
    if (dtSec < 1 || dtSec > ENGINE.maxMovingGapMs / 1000) return null;
    const implied = d / dtSec;
    const doppler = to.speed != null && to.speed >= 0 ? to.speed : null;
    const gate = Math.max(ENGINE.minStepM, accRadius > 0 ? accRadius : 4);
    const dopplerAgrees =
      doppler == null || (doppler >= this.cfg.minMovingSpeedMps * 0.5 && doppler <= this.cfg.maxSpeedMps);
    if (d < gate || implied < this.cfg.minMovingSpeedMps || implied > this.cfg.maxSpeedMps || !dopplerAgrees) return null;
    if (this.hopStreak < 2 && this.departStreak < 1) return null;
    return { d, from: anchor, to };
  }

  /** Fold a segment's last real step into the totals. Does not run during a live summary. */
  private commitTail(to: RawPoint) {
    const chord = this.pendingChord(to);
    if (!chord) return;
    const distBefore = this.distanceM;
    this.distanceM += chord.d;
    const step = this.distanceM - distBefore;
    while (this.distanceM >= (this.splits.length + 1) * SPLIT_M) {
      const boundary = (this.splits.length + 1) * SPLIT_M;
      const f = step > 0 ? (boundary - distBefore) / step : 1;
      const tCross = chord.from.t + f * (chord.to.t - chord.from.t);
      const movingCross = this.anchorMovingMs + f * (this.movingMs - this.anchorMovingMs);
      this.pushSplit(boundary, movingCross, tCross, SPLIT_M);
    }
    this.anchor = chord.to;
    this.anchorMovingMs = this.movingMs;
    this.departStreak = 0;
    this.departDist = 0;
    this.departBearing = null;
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
    const windowMoving = this.windowSpeed != null && this.windowSpeed >= this.cfg.minMovingSpeedMps * 0.5;
    if (!windowMoving) return 0;
    if (p.speed != null && p.speed >= this.cfg.minMovingSpeedMps) return p.speed;
    return this.windowSpeed ?? 0;
  }

  /** Latest fix when it continues real movement but has not yet been confirmed onto the route. */
  tailPoint(): RawPoint | null {
    return this.pendingChord(this.lastAccepted)?.to ?? null;
  }

  summary(session: { startedAt: number; finishedAt: number | null; pauses: PauseInterval[]; now?: number }): TrackSummary {
    const tail = this.pendingChord(this.lastAccepted);
    const distanceWithTail = this.distanceM + (tail?.d ?? 0);
    const end = session.finishedAt ?? session.now ?? Date.now();
    const elapsedMs = Math.max(0, end - session.startedAt);
    const pausedMs = totalPausedMs(session.pauses, end);
    const splits = [...this.splits];
    const s = this.splitStart;
    const remaining = s ? distanceWithTail - s.d : 0;
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
    const distanceM = Math.round(distanceWithTail * 10) / 10;
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

/**
 * Points that represent real movement: the start of each segment, plus each fix that advanced
 * the distance anchor. Stationary GPS wander is not included, so the polyline does not scribble.
 */
export const routePoints = (sport: string, points: RawPoint[]): RawPoint[] => {
  const acc = new TrackAccumulator(sport);
  const out: RawPoint[] = [];
  for (const p of points) {
    const r = acc.add(p);
    if (r.accepted && (r.gapBefore || r.moved)) out.push(p);
  }
  const tail = acc.tailPoint();
  if (tail && out[out.length - 1] !== tail) out.push(tail);
  return out;
};

const bearingDeg = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const λ = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(λ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const turnDeg = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/** Pace (s/km) from a speed, or null when the athlete is effectively stationary. */
export const paceSecPerKm = (speedMps: number | null | undefined, minSpeedMps = 0.3): number | null =>
  speedMps != null && Number.isFinite(speedMps) && speedMps >= minSpeedMps ? 1000 / speedMps : null;
