import { haversineM, isValidCoordinate } from './geo';
import { ENGINE, TrackingConfig } from './sports';
import { RawPoint } from './types';

export type RejectReason = 'invalid' | 'accuracy' | 'stale' | 'speed';

export interface FilterResult {
  accepted: boolean;
  reason?: RejectReason;
  /**
   * The accepted point starts a new run of continuous track: first point, first point after a
   * resume (new segment), or a re-anchor after a persistent jump. No distance or moving time is
   * credited between the previous point and this one.
   */
  gapBefore?: boolean;
  /** Set by TrackAccumulator when this fix advanced the distance anchor (real movement). */
  moved?: boolean;
}

/**
 * Stateful GPS point filter. Deterministic: the same sequence of points always yields the same
 * decisions, so the server can re-run it on the uploaded raw track.
 *
 * Rules, in order:
 *  1. invalid   — non-finite or out-of-range coordinates, or (0,0).
 *  2. accuracy  — horizontal accuracy worse than the sport limit.
 *  3. stale     — timestamp not after the last accepted fix (duplicates, out-of-order delivery).
 *  4. speed     — implied speed from the last accepted fix (after subtracting both accuracy radii)
 *                 exceeds the sport's physical maximum: a GPS spike. If spikes persist for
 *                 ENGINE.spikeResetMs, the earlier anchor was the bad one (e.g. tunnel exit, wrong
 *                 first fix), so we accept the new position as a fresh anchor with a gap.
 */
export class PointFilter {
  private last: RawPoint | null = null;
  private spikeSince: number | null = null;

  constructor(private readonly cfg: TrackingConfig) {}

  push(p: RawPoint): FilterResult {
    if (!Number.isFinite(p.t) || !isValidCoordinate(p.lat, p.lng)) return { accepted: false, reason: 'invalid' };
    if (p.acc != null && (!Number.isFinite(p.acc) || p.acc <= 0 || p.acc > this.cfg.maxAccuracyM))
      return { accepted: false, reason: 'accuracy' };

    const last = this.last;
    if (last) {
      if (p.t <= last.t) return { accepted: false, reason: 'stale' };
      if (p.seg === last.seg) {
        const d = haversineM(last.lat, last.lng, p.lat, p.lng);
        const dt = (p.t - last.t) / 1000;
        const margin = Math.min(d, (p.acc ?? 0) + (last.acc ?? 0));
        if ((d - margin) / dt > this.cfg.maxSpeedMps) {
          if (this.spikeSince == null) this.spikeSince = p.t;
          if (p.t - this.spikeSince < ENGINE.spikeResetMs) return { accepted: false, reason: 'speed' };
          this.spikeSince = null;
          this.last = p;
          return { accepted: true, gapBefore: true };
        }
      }
    }

    this.spikeSince = null;
    const gapBefore = !last || p.seg !== last.seg;
    this.last = p;
    return { accepted: true, gapBefore };
  }
}
