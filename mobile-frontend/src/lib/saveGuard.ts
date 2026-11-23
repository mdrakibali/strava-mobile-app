/** Distance below this, with no moving time, means the athlete never actually moved. */
export const MIN_SAVE_DISTANCE_M = 10;

const INDOOR = new Set(['Workout', 'Yoga']);

/**
 * A GPS activity with no real movement (standing still, or GPS never settled) must not be
 * published: it would put a "0.00 km, 0 s" post in everyone's feed. Indoor timers have no
 * distance by design, so they are exempt. The athlete can still Resume or Discard.
 */
export function noMovementReason(
  sport: string,
  distanceM: number,
  movingTimeS: number
): string | null {
  if (INDOOR.has(sport)) return null;
  if (distanceM >= MIN_SAVE_DISTANCE_M || movingTimeS > 0) return null;
  return 'No movement was recorded, so there is nothing to publish. Resume to keep recording, or discard it.';
}
