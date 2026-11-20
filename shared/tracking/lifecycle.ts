import { totalPausedMs } from './metrics';
import { PauseInterval } from './types';

/**
 * Recording lifecycle (pure; persisted by the app after every transition).
 *
 *   IDLE → PREPARING → RECORDING ⇄ PAUSED → COMPLETED
 *                          │           │         │
 *                          └───────────┴─────────┴──→ DISCARDED
 *
 * An unexpected interruption (process killed, phone rebooted) is the INTERRUPT event: the session
 * becomes PAUSED with reason 'interrupted' from the last known fix, so the gap never counts as
 * active time, and the athlete chooses Resume or Finish (recovery).
 */
export type LifecycleStatus = 'idle' | 'preparing' | 'recording' | 'paused' | 'completed' | 'discarded';

export type PauseReason = 'manual' | 'interrupted';

export interface LifecycleState {
  status: LifecycleStatus;
  startedAt: number | null;
  finishedAt: number | null;
  pauses: PauseInterval[];
  pauseReason: PauseReason | null;
  /** Current segment; incremented on every resume so distance never bridges a pause. */
  segment: number;
}

export type LifecycleEvent =
  | { type: 'PREPARE' }
  | { type: 'CANCEL' }
  | { type: 'START'; at: number }
  | { type: 'PAUSE'; at: number }
  | { type: 'INTERRUPT'; at: number }
  | { type: 'RESUME'; at: number }
  | { type: 'FINISH'; at: number }
  | { type: 'DISCARD' };

export const INITIAL_LIFECYCLE: LifecycleState = {
  status: 'idle',
  startedAt: null,
  finishedAt: null,
  pauses: [],
  pauseReason: null,
  segment: 0,
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: LifecycleStatus,
    readonly event: LifecycleEvent['type']
  ) {
    super(`Invalid recording transition: ${event} while ${from}`);
    this.name = 'InvalidTransitionError';
  }
}

const closePause = (pauses: PauseInterval[], at: number): PauseInterval[] =>
  pauses.map(([s, e], i) => (i === pauses.length - 1 && e == null ? [s, Math.max(s, at)] : [s, e]));

export const transition = (state: LifecycleState, event: LifecycleEvent): LifecycleState => {
  const bad = () => {
    throw new InvalidTransitionError(state.status, event.type);
  };
  switch (event.type) {
    case 'PREPARE':
      return state.status === 'idle' ? { ...INITIAL_LIFECYCLE, status: 'preparing' } : bad();
    case 'CANCEL':
      return state.status === 'preparing' ? INITIAL_LIFECYCLE : bad();
    case 'START':
      return state.status === 'idle' || state.status === 'preparing'
        ? { ...INITIAL_LIFECYCLE, status: 'recording', startedAt: event.at }
        : bad();
    case 'PAUSE':
    case 'INTERRUPT':
      if (state.status !== 'recording') return bad();
      return {
        ...state,
        status: 'paused',
        pauseReason: event.type === 'PAUSE' ? 'manual' : 'interrupted',
        pauses: [...state.pauses, [Math.max(event.at, state.startedAt ?? event.at), null]],
      };
    case 'RESUME':
      if (state.status !== 'paused') return bad();
      return {
        ...state,
        status: 'recording',
        pauseReason: null,
        pauses: closePause(state.pauses, event.at),
        segment: state.segment + 1,
      };
    case 'FINISH':
      if (state.status !== 'recording' && state.status !== 'paused') return bad();
      if (state.status === 'paused') {
        // A finish while paused ends the activity at the pause start: the paused tail (possibly hours
        // after an interruption) is not part of the activity, so the open pause is dropped.
        const open = state.pauses[state.pauses.length - 1];
        return {
          ...state,
          status: 'completed',
          finishedAt: open ? open[0] : event.at,
          pauses: state.pauses.slice(0, -1),
          pauseReason: null,
        };
      }
      return { ...state, status: 'completed', finishedAt: event.at, pauseReason: null };
    case 'DISCARD':
      return state.status === 'idle' ? bad() : { ...state, status: 'discarded' };
  }
};

export const isActive = (s: LifecycleStatus) => s === 'recording' || s === 'paused';

/** Timer value shown on the recorder: wall clock minus manual pauses. Never drifts (no tick counting). */
export const activeMs = (state: LifecycleState, now: number): number => {
  if (state.startedAt == null) return 0;
  const end = state.finishedAt ?? now;
  return Math.max(0, end - state.startedAt - totalPausedMs(state.pauses, end));
};

export const elapsedMs = (state: LifecycleState, now: number): number =>
  state.startedAt == null ? 0 : Math.max(0, (state.finishedAt ?? now) - state.startedAt);
