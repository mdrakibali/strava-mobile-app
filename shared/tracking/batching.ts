import { PauseInterval, WirePoint } from './types';

/**
 * Batch upload protocol shared by the app (sync worker) and the Worker (upload endpoints).
 *
 *   POST /activities/uploads                       { clientActivityId, sportType, startTime }
 *   PUT  /activities/uploads/:cid/batches/:seq     { points: WirePoint[] }
 *   POST /activities/uploads/:cid/complete         { ...details, batchCount }
 *
 * Batch k always contains points [k·SIZE, (k+1)·SIZE) of the session in recording order, so a
 * batch's content never changes once it is full ("sealed"). During recording only sealed batches
 * are sent; the final partial batch is sent after Finish. Every call is idempotent: repeating it
 * returns the same result, which is what makes blind retries safe.
 */
export const UPLOAD_BATCH_SIZE = 300;
export const MAX_POINTS_PER_BATCH = 1000;
/** 400 × 300 = 120k points ≈ 33 h at 1 Hz. */
export const MAX_BATCHES = 400;

export const sealedBatchCount = (pointCount: number, final: boolean, size = UPLOAD_BATCH_SIZE) =>
  final ? Math.ceil(pointCount / size) : Math.floor(pointCount / size);

export const missingSeqs = (received: Iterable<number>, batchCount: number): number[] => {
  const have = new Set(received);
  const out: number[] = [];
  for (let i = 0; i < batchCount; i++) if (!have.has(i)) out.push(i);
  return out;
};

/** Exponential backoff: 2 s, 4 s, 8 s … capped at 5 min. `random` ∈ [0,1) adds up to 25% jitter. */
export const retryDelayMs = (attempt: number, random = 0) => {
  const base = Math.min(5 * 60_000, 2000 * 2 ** Math.max(0, attempt));
  return Math.round(base * (1 + 0.25 * random));
};

export type ActivityVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';

export interface UploadStartRequest {
  clientActivityId: string;
  sportType: string;
  startTime: string;
}

export interface UploadBatchRequest {
  points: WirePoint[];
}

export interface UploadCompleteRequest {
  title: string;
  description?: string;
  sportType: string;
  visibility: ActivityVisibility;
  startTime: string;
  finishedAt: string;
  pauses: PauseInterval[];
  batchCount: number;
  weightKg?: number;
}

export interface UploadStatusResponse {
  upload: {
    clientActivityId: string;
    status: 'OPEN' | 'COMPLETED';
    receivedSeqs: number[];
    activityId: string | null;
  };
}
