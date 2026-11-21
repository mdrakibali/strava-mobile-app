import { FilterResult } from './filter';
import { TrackAccumulator } from './metrics';
import { RawPoint } from './types';

/**
 * The drawn route as continuous runs of real movement.
 *
 * A run starts at an accepted fix flagged `gapBefore` (first fix, first fix after a resume, or
 * a re-anchor after a GPS jump) and grows only with fixes that actually advanced the distance
 * anchor (`moved`). Two consequences keep the map honest:
 *  - a run that never moved (the athlete stood still after the anchor) draws nothing, so a
 *    stationary or 0 km recording has no route line;
 *  - runs are never joined to each other, so no line is drawn across a pause or a GPS jump
 *    where no distance was credited.
 */
export class RouteSegments {
  private runs: RawPoint[][] = [];

  /** Returns true when the drawn route changed. */
  add(p: RawPoint, r: FilterResult): boolean {
    if (!r.accepted) return false;
    if (r.gapBefore || this.runs.length === 0) {
      this.runs.push([p]);
      return true;
    }
    if (r.moved) {
      this.runs[this.runs.length - 1].push(p);
      return true;
    }
    return false;
  }

  /** The latest fix continues real movement but is not confirmed onto the route yet. */
  attachTail(tail: RawPoint | null): void {
    const run = this.runs[this.runs.length - 1];
    if (tail && run && run[run.length - 1] !== tail) run.push(tail);
  }

  /** Only runs with at least two points have a line to draw. */
  drawn(): RawPoint[][] {
    return this.runs.filter((run) => run.length >= 2);
  }
}

/** Batch version over a stored track (what the server and the save step store). */
export const routeSegments = (sport: string, points: RawPoint[]): RawPoint[][] => {
  const acc = new TrackAccumulator(sport);
  const route = new RouteSegments();
  for (const p of points) route.add(p, acc.add(p));
  route.attachTail(acc.tailPoint());
  return route.drawn();
};
