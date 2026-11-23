import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { queryClient } from '../lib/queryClient';
import { activityKeys } from '../hooks/useActivities';
import { ApiError, api, getAuthToken } from '../services/api';
import { batchesRepo, pointsRepo, SessionRow, sessionsRepo } from './db';
import {
  acceptedPoints,
  routePoints,
  estimateCalories,
  retryDelayMs,
  sealedBatchCount,
  summarizeTrack,
  toWire,
  UPLOAD_BATCH_SIZE,
} from './shared';

/**
 * Offline-first upload worker (ADR-06). Completed recordings sit in SQLite with
 * sync_state='queued' until the server confirms them; nothing is deleted before that.
 *
 *   start upload → PUT every unacknowledged batch → complete
 *
 * Every step is idempotent on the server (clientActivityId + batch seq), so retrying after a
 * timeout, a crash or a lost response can never create a duplicate. Triggers: after Save, app
 * foreground, network regained, a backoff timer, and manual Retry. One run at a time.
 */

export interface PendingUpload {
  id: string;
  title: string;
  sport: string;
  startedAt: number | null;
  state: 'queued' | 'needs_attention';
  lastError: string | null;
  nextAttemptAt: number | null;
}

type Listener = () => void;

class SyncWorker {
  private running: Promise<void> | null = null;
  private again = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private athleteId: string | null = null;
  private viewer: {
    id: string;
    displayName: string;
    username?: string;
    avatarUrl: string | null;
    city: string | null;
  } | null = null;
  private pending: PendingUpload[] = [];
  private listeners = new Set<Listener>();
  private lastSynced: { sessionId: string; activityId: string | null } | null = null;
  private started = false;

  subscribe = (fn: Listener) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getPending = () => this.pending;
  private emit() {
    this.listeners.forEach((l) => l());
  }

  /** Install triggers once (app foreground, network back online). */
  startTriggers() {
    if (this.started) return;
    this.started = true;
    AppState.addEventListener('change', (s) => s === 'active' && this.kick());
    Network.addNetworkStateListener((s) => s.isInternetReachable && this.kick());
  }

  setAthlete(id: string | null) {
    this.athleteId = id;
    if (!id) this.viewer = null;
    this.refreshPending().then(() => this.kick());
  }

  /** Name and photo used when a just-published activity is placed on the feed before the next refetch. */
  setViewer(
    viewer: {
      id: string;
      displayName: string;
      username?: string;
      avatarUrl: string | null;
      city: string | null;
    } | null
  ) {
    this.viewer = viewer;
  }

  async refreshPending() {
    if (!this.athleteId) {
      this.pending = [];
      return this.emit();
    }
    const rows = await sessionsRepo.listUnsynced(this.athleteId);
    this.pending = rows.map((r) => ({
      id: r.id,
      title: r.save?.title ?? 'Activity',
      sport: r.save?.sportType ?? r.sport,
      startedAt: r.startedAt,
      state: r.syncState === 'needs_attention' ? 'needs_attention' : 'queued',
      lastError: r.lastError,
      nextAttemptAt: r.nextAttemptAt,
    }));
    this.emit();
  }

  /** Request a run; coalesces with one in progress. `force` ignores backoff (manual Retry). */
  kick(force = false): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.runOnce(force);
          force = false;
        } while (this.again);
      } finally {
        this.running = null;
        await this.refreshPending().catch(() => {});
        this.schedule();
      }
    })();
    return this.running;
  }

  /** Wait (bounded) for a specific session to be confirmed by the server. */
  async waitFor(
    sessionId: string,
    timeoutMs: number
  ): Promise<{ synced: boolean; activityId: string | null }> {
    const deadline = Date.now() + timeoutMs;
    await Promise.race([this.kick(true), new Promise((r) => setTimeout(r, timeoutMs))]);
    while (Date.now() < deadline) {
      const s = await sessionsRepo.get(sessionId);
      if (s?.syncState === 'synced') return { synced: true, activityId: s.serverActivityId };
      if (!this.running) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    const s = await sessionsRepo.get(sessionId);
    return { synced: s?.syncState === 'synced', activityId: s?.serverActivityId ?? null };
  }

  consumeLastSynced() {
    const v = this.lastSynced;
    this.lastSynced = null;
    return v;
  }

  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const next = this.pending
      .filter((p) => p.state === 'queued' && p.nextAttemptAt)
      .map((p) => p.nextAttemptAt!)
      .sort((a, b) => a - b)[0];
    if (next) this.timer = setTimeout(() => this.kick(), Math.max(1000, next - Date.now()));
  }

  private async runOnce(force: boolean) {
    if (!this.athleteId || !getAuthToken()) return;
    const sessions = await sessionsRepo.listUnsynced(this.athleteId);
    for (const s of sessions) {
      if (s.syncState === 'needs_attention' && !force) continue;
      if (!force && s.nextAttemptAt && s.nextAttemptAt > Date.now()) continue;
      try {
        await this.syncSession(s);
      } catch (e) {
        await this.handleFailure(s, e);
        if (e instanceof ApiError && (e.status === 0 || e.status === 401)) break; // offline / signed out: stop the pass
      }
    }
    await sessionsRepo.pruneSynced().catch(() => {});
  }

  private async handleFailure(s: SessionRow, e: unknown) {
    const err =
      e instanceof ApiError ? e : new ApiError((e as any)?.message ?? 'Upload failed', 0, 'client');
    if (err.status === 401) {
      // Keep it queued: it uploads after the athlete signs in again.
      await sessionsRepo.updateSync(s.id, { lastError: 'Sign in again to upload.' });
    } else if (err.retryable || err.code === 'missing_batches') {
      const attempts = s.attempts + 1;
      await sessionsRepo.updateSync(s.id, {
        attempts,
        nextAttemptAt: Date.now() + retryDelayMs(attempts - 1, Math.random()),
        lastError: err.message,
      });
    } else {
      // Validation or other permanent rejection: needs the athlete (never silently dropped).
      await sessionsRepo.updateSync(s.id, { syncState: 'needs_attention', lastError: err.message });
    }
  }

  private async syncSession(s: SessionRow) {
    const save = s.save;
    if (!save || s.startedAt == null || s.finishedAt == null) {
      throw new ApiError('This recording is incomplete and can’t be uploaded.', 422, 'incomplete');
    }
    const startTime = new Date(s.startedAt).toISOString();
    const wireSport =
      save.sportType === 'Workout' || save.sportType === 'Yoga' ? 'Run' : save.sportType;

    if (!s.uploadStarted) {
      try {
        const res = await api.uploads.start({
          clientActivityId: s.id,
          sportType: wireSport,
          startTime,
        });
        await batchesRepo.reset(s.id);
        await batchesRepo.ack(s.id, res.upload.receivedSeqs);
        if (res.upload.status === 'COMPLETED') {
          return this.markSynced(s, res.upload.activityId, null);
        }
      } catch (e) {
        // POST /activities/uploads never 404s on a current server, so a 404 means the deployed
        // backend predates batch uploads: fall back to the legacy single request.
        if (e instanceof ApiError && e.status === 404) return this.legacyUpload(s);
        throw e;
      }
      await sessionsRepo.updateSync(s.id, { uploadStarted: true });
    }

    const batchCount = sealedBatchCount(s.pointCount, true);
    const acked = await batchesRepo.acked(s.id);
    for (let seq = 0; seq < batchCount; seq++) {
      if (acked.has(seq)) continue;
      const pts = await pointsRepo.range(
        s.id,
        seq * UPLOAD_BATCH_SIZE,
        (seq + 1) * UPLOAD_BATCH_SIZE
      );
      try {
        await api.uploads.putBatch(s.id, seq, { points: pts.map(toWire) });
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          // The server lost the upload record: start over (all steps are idempotent).
          await sessionsRepo.updateSync(s.id, { uploadStarted: false });
          await batchesRepo.reset(s.id);
        }
        throw e;
      }
      await batchesRepo.ack(s.id, [seq]);
    }

    try {
      const res = await api.uploads.complete(s.id, {
        title: save.title,
        description: save.description || undefined,
        sportType: wireSport,
        visibility: save.visibility,
        startTime,
        finishedAt: new Date(s.finishedAt).toISOString(),
        pauses: s.pauses,
        batchCount,
      });
      return this.markSynced(s, res.activity?.id ?? null, res.activity);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'missing_batches') {
        await batchesRepo.unack(s.id, e.details?.missingSeqs ?? []);
      }
      throw e;
    }
  }

  /** Transitional path for a backend without /activities/uploads (still idempotent once deployed). */
  private async legacyUpload(s: SessionRow) {
    const save = s.save!;
    const wireSport =
      save.sportType === 'Workout' || save.sportType === 'Yoga' ? 'Run' : save.sportType;
    const points = await pointsRepo.range(s.id);
    const sum = summarizeTrack({
      sport: wireSport,
      points,
      startedAt: s.startedAt!,
      finishedAt: s.finishedAt,
      pauses: s.pauses,
    });
    const kept = acceptedPoints(wireSport, points);
    const drawn = routePoints(wireSport, points);
    const track = sum.distanceM >= 10 && drawn.length >= 2 ? drawn : [];
    const res = await api.activities.create({
      clientActivityId: s.id,
      title: save.title,
      description: save.description || undefined,
      sportType: wireSport,
      visibility: save.visibility,
      startTime: new Date(s.startedAt!).toISOString(),
      distanceMeters: sum.distanceM,
      movingTimeSeconds: sum.movingTimeS,
      elapsedTimeSeconds: Math.max(sum.elapsedTimeS, sum.movingTimeS),
      elevationGainMeters: sum.elevGainM ?? 0,
      maxSpeedMps: sum.maxSpeedMps ?? undefined,
      calories: estimateCalories(save.sportType, sum.distanceM, sum.movingTimeS) ?? undefined,
      rawPolyline: track.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
        altitude: p.alt,
        timestamp: p.t,
        speed: p.speed,
      })),
      splits: sum.splits.map((sp) => ({
        splitNumber: sp.index,
        distanceKm: Math.round(sp.distanceM) / 1000,
        paceFormatted:
          sp.movingTimeS > 0 && sp.distanceM >= 50
            ? (() => {
                const v = Math.round(sp.movingTimeS / (sp.distanceM / 1000));
                return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')} /km`;
              })()
            : null,
        elevationDeltaMeters: sp.elevDiffM,
      })),
      elevationProfile:
        sum.elevGainM == null
          ? []
          : kept.filter((p) => p.alt != null).map((p) => Math.round(p.alt!)),
    });
    return this.markSynced(s, res?.activity?.id ?? null, res?.activity);
  }

  private async markSynced(s: SessionRow, activityId: string | null, row: any) {
    await sessionsRepo.updateSync(s.id, {
      syncState: 'synced',
      serverActivityId: activityId,
      lastError: null,
      nextAttemptAt: null,
    });
    this.lastSynced = { sessionId: s.id, activityId };
    if (row?.id && this.viewer) {
      queryClient.invalidateQueries({ queryKey: activityKeys.all });
    }
  }
}

export const syncWorker = new SyncWorker();
