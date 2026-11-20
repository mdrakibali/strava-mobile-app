/**
 * Sync worker: batch upload, retry/backoff, mockServer acknowledgement and duplicate prevention.
 * SQLite and HTTP are replaced by in-memory fakes; the worker logic is the real one.
 */
import { ApiError } from '../../services/api';
import type { SessionRow } from '../db';

type Fake = { sessions: Map<string, SessionRow>; points: Map<string, any[]>; acked: Map<string, Set<number>> };
const mockStore: Fake = { sessions: new Map(), points: new Map(), acked: new Map() };

jest.mock('expo-network', () => ({ addNetworkStateListener: jest.fn() }));
jest.mock('../db', () => ({
  sessionsRepo: {
    listUnsynced: async (athleteId: string) =>
      [...mockStore.sessions.values()].filter(
        (s) => s.athleteId === athleteId && s.status === 'completed' && (s.syncState === 'queued' || s.syncState === 'needs_attention')
      ),
    get: async (id: string) => mockStore.sessions.get(id) ?? null,
    updateSync: async (id: string, patch: Partial<SessionRow>) => {
      const s = mockStore.sessions.get(id)!;
      mockStore.sessions.set(id, { ...s, ...patch });
    },
    pruneSynced: async () => {},
  },
  pointsRepo: {
    range: async (id: string, from = 0, to = Number.MAX_SAFE_INTEGER) => (mockStore.points.get(id) ?? []).slice(from, to),
  },
  batchesRepo: {
    acked: async (id: string) => new Set(mockStore.acked.get(id) ?? []),
    ack: async (id: string, seqs: number[]) => {
      const set = mockStore.acked.get(id) ?? new Set<number>();
      seqs.forEach((s) => set.add(s));
      mockStore.acked.set(id, set);
    },
    unack: async (id: string, seqs: number[]) => seqs.forEach((s) => mockStore.acked.get(id)?.delete(s)),
    reset: async (id: string) => mockStore.acked.set(id, new Set()),
  },
}));

// Fake mockServer implementing the idempotent protocol.
const mockServer = {
  uploads: new Map<string, { batches: Map<number, number>; activityId: string | null }>(),
  activities: 0,
  failNext: [] as (ApiError | null)[],
  calls: [] as string[],
  maybeFail(name: string) {
    this.calls.push(name);
    const f = this.failNext.shift();
    if (f) throw f;
  },
};

jest.mock('../../services/api', () => {
  const actual = jest.requireActual('../../services/api');
  return {
    ...actual,
    getAuthToken: () => 'token',
    api: {
      uploads: {
        start: async ({ clientActivityId }: any) => {
          mockServer.maybeFail('start');
          const u = mockServer.uploads.get(clientActivityId) ?? { batches: new Map(), activityId: null };
          mockServer.uploads.set(clientActivityId, u);
          return {
            upload: {
              clientActivityId,
              status: u.activityId ? 'COMPLETED' : 'OPEN',
              receivedSeqs: [...u.batches.keys()],
              activityId: u.activityId,
            },
          };
        },
        putBatch: async (cid: string, seq: number, { points }: any) => {
          mockServer.maybeFail(`batch:${seq}`);
          mockServer.uploads.get(cid)!.batches.set(seq, points.length);
          return { seq, duplicate: false, completed: false };
        },
        complete: async (cid: string, body: any) => {
          mockServer.maybeFail('complete');
          const u = mockServer.uploads.get(cid)!;
          if (u.activityId) return { created: false, deleted: false, activity: { id: u.activityId } };
          const missing = [...Array(body.batchCount).keys()].filter((i) => !u.batches.has(i));
          if (missing.length) throw new actual.ApiError('missing', 409, 'missing_batches', { missingSeqs: missing });
          u.activityId = `act_${++mockServer.activities}`;
          return { created: true, deleted: false, activity: { id: u.activityId } };
        },
      },
      activities: { create: jest.fn() },
    },
  };
});

// eslint-disable-next-line import/first
import { syncWorker } from '../sync';

const T0 = 1_700_000_000_000;
const session = (id: string, pointCount: number, over: Partial<SessionRow> = {}): SessionRow => {
  mockStore.points.set(
    id,
    Array.from({ length: pointCount }, (_, i) => ({ t: T0 + i * 1000, lat: 23.78, lng: 90.42 + i * 0.00003, acc: 5, alt: null, altAcc: null, speed: 3, seg: 0 }))
  );
  const s: SessionRow = {
    id,
    athleteId: 'me',
    sport: 'Run',
    status: 'completed',
    startedAt: T0,
    finishedAt: T0 + pointCount * 1000,
    pauses: [],
    pauseReason: null,
    segment: 0,
    lastFixAt: null,
    pointCount,
    save: { title: 'Run', description: '', sportType: 'Run', visibility: 'PUBLIC' },
    syncState: 'queued',
    uploadStarted: false,
    serverActivityId: null,
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    createdAt: T0,
    updatedAt: T0,
    ...over,
  };
  mockStore.sessions.set(id, s);
  return s;
};

beforeEach(() => {
  mockStore.sessions.clear();
  mockStore.points.clear();
  mockStore.acked.clear();
  mockServer.uploads.clear();
  mockServer.activities = 0;
  mockServer.failNext = [];
  mockServer.calls = [];
  syncWorker.setAthlete('me');
});

it('uploads in sealed batches of 300 and completes once', async () => {
  session('s1', 650);
  await syncWorker.kick(true);
  expect(mockServer.calls).toEqual(['start', 'batch:0', 'batch:1', 'batch:2', 'complete']);
  expect(mockServer.uploads.get('s1')!.batches.get(2)).toBe(50);
  expect(mockStore.sessions.get('s1')).toMatchObject({ syncState: 'synced', serverActivityId: 'act_1' });
});

it('keeps data and schedules a retry when offline, then resumes without re-sending acked batches', async () => {
  session('s1', 650);
  mockServer.failNext = [null, null, new ApiError('offline', 0, 'network')]; // start ok, batch0 ok, batch1 fails
  await syncWorker.kick(true);
  const after = mockStore.sessions.get('s1')!;
  expect(after.syncState).toBe('queued');
  expect(after.attempts).toBe(1);
  expect(after.nextAttemptAt).toBeGreaterThan(Date.now());
  expect(mockStore.points.get('s1')).toHaveLength(650); // nothing deleted

  mockServer.calls = [];
  await syncWorker.kick(true); // "network restored" (manual retry ignores backoff)
  expect(mockServer.calls).toEqual(['batch:1', 'batch:2', 'complete']);
  expect(mockStore.sessions.get('s1')!.syncState).toBe('synced');
  expect(mockServer.activities).toBe(1);
});

it('never creates a duplicate when the completion response is lost', async () => {
  session('s1', 10);
  // The mockServer completes, but the response never arrives.
  const origComplete = mockServer.maybeFail.bind(mockServer);
  let lost = true;
  mockServer.maybeFail = function (name: string) {
    origComplete(name);
    if (name === 'complete' && lost) {
      lost = false;
      const u = mockServer.uploads.get('s1')!;
      u.activityId = `act_${++mockServer.activities}`;
      throw new ApiError('timeout', 0, 'network');
    }
  };
  await syncWorker.kick(true);
  expect(mockStore.sessions.get('s1')!.syncState).toBe('queued');
  await syncWorker.kick(true);
  expect(mockStore.sessions.get('s1')).toMatchObject({ syncState: 'synced', serverActivityId: 'act_1' });
  expect(mockServer.activities).toBe(1);
  mockServer.maybeFail = origComplete;
});

it('coalesces concurrent triggers into one run (single flight)', async () => {
  session('s1', 10);
  await Promise.all([syncWorker.kick(true), syncWorker.kick(true), syncWorker.kick()]);
  expect(mockServer.calls.filter((c) => c === 'complete')).toHaveLength(1);
  expect(mockServer.activities).toBe(1);
});

it('re-sends batches the mockServer reports missing', async () => {
  session('s1', 400);
  mockStore.acked.set('s1', new Set([0, 1])); // phone believes both were acked…
  mockStore.sessions.set('s1', { ...mockStore.sessions.get('s1')!, uploadStarted: true });
  mockServer.uploads.set('s1', { batches: new Map([[0, 300]]), activityId: null }); // …mockServer only has 0
  await syncWorker.kick(true);
  expect(mockStore.sessions.get('s1')!.syncState).toBe('queued'); // 409 → retry scheduled
  await syncWorker.kick(true);
  expect(mockStore.sessions.get('s1')!.syncState).toBe('synced');
});

it('marks permanent rejections as needing attention instead of retrying forever', async () => {
  session('s1', 10);
  mockServer.failNext = [new ApiError('Request validation failed', 400, 'validation_failed')];
  await syncWorker.kick(true);
  expect(mockStore.sessions.get('s1')).toMatchObject({ syncState: 'needs_attention', lastError: 'Request validation failed' });
  mockServer.calls = [];
  await syncWorker.kick(); // automatic runs skip it
  expect(mockServer.calls).toEqual([]);
  expect(mockStore.points.get('s1')).toHaveLength(10);
});

it('only uploads the signed-in athlete’s recordings', async () => {
  session('s1', 10, { athleteId: 'someone-else' });
  await syncWorker.kick(true);
  expect(mockServer.calls).toEqual([]);
});
