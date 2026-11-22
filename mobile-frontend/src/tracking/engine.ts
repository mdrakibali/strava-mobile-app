import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import { PermissionsAndroid, Platform } from 'react-native';
import { pointsRepo, SaveDetails, sessionsRepo } from './db';
import {
  INITIAL_LIFECYCLE,
  LifecycleEvent,
  LifecycleState,
  RawPoint,
  RouteSegments,
  TrackAccumulator,
  TrackSummary,
  transition,
} from './shared';

/**
 * Centralized recording engine (ADR-03/04/05). Owns the lifecycle, GPS collection and live
 * metrics; screens only read snapshots (useRecording) and call commands. Every transition is
 * written to SQLite before it takes effect, so a killed process can be recovered.
 *
 * GPS runs in an Android foreground service via expo-location + expo-task-manager (location
 * task defined in ./locationTask). Map rendering is independent: the engine never waits on the UI.
 */

export const LOCATION_TASK = 'open-strava-recording-location';

export type LngLat = [number, number];

const toLngLatRuns = (b: RouteSegments): LngLat[][] => b.drawn().map((run) => run.map((p) => [p.lng, p.lat] as LngLat));

export interface Fix {
  lat: number;
  lng: number;
  acc: number | null;
  t: number;
}

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'services_off';

export interface RecordingSnapshot {
  ready: boolean;
  sessionId: string | null;
  sport: string;
  lifecycle: LifecycleState;
  distanceM: number;
  movingTimeS: number;
  maxSpeedMps: number;
  elevGainM: number | null;
  /** Speed at the last accepted fix (Doppler when available); see liveSpeed() for staleness. */
  speedAtLastFixMps: number;
  lastAcceptedAt: number | null;
  /** Accepted route, [lng, lat], flattened. New array identity on every change. */
  route: LngLat[];
  /**
   * What the map draws: continuous runs of real movement, never joined across a pause or a GPS
   * jump, and a run that never moved is absent (see shared/tracking/route.ts).
   */
  routeSegments: LngLat[][];
  /** Last raw fix of any quality (incl. while paused / preparing) — GPS status + map position. */
  lastFix: Fix | null;
  permission: PermissionState;
  error: string | null;
}

const EMPTY: RecordingSnapshot = {
  ready: false,
  sessionId: null,
  sport: 'Run',
  lifecycle: INITIAL_LIFECYCLE,
  distanceM: 0,
  movingTimeS: 0,
  maxSpeedMps: 0,
  elevGainM: null,
  speedAtLastFixMps: 0,
  lastAcceptedAt: null,
  route: [],
  routeSegments: [],
  lastFix: null,
  permission: 'unknown',
  error: null,
};

type LocationObjectLike = Pick<Location.LocationObject, 'coords' | 'timestamp'>;

const toPoint = (l: LocationObjectLike): Omit<RawPoint, 'seg'> => ({
  t: Math.round(l.timestamp),
  lat: l.coords.latitude,
  lng: l.coords.longitude,
  acc: l.coords.accuracy ?? null,
  alt: l.coords.altitude ?? null,
  altAcc: l.coords.altitudeAccuracy ?? null,
  // Android reports -1 / 0 when speed is unavailable; only trust positive values or explicit 0 with accuracy
  speed: l.coords.speed != null && l.coords.speed >= 0 ? l.coords.speed : null,
});

class RecordingEngine {
  private snap: RecordingSnapshot = EMPTY;
  private listeners = new Set<() => void>();
  private acc: TrackAccumulator | null = null;
  private routeBuilder = new RouteSegments();
  private athleteId: string | null = null;
  private loading: Promise<void> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private previewSub: Location.LocationSubscription | null = null;

  // ---- store plumbing (useSyncExternalStore) ----
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snap;
  private set(patch: Partial<RecordingSnapshot>) {
    this.snap = { ...this.snap, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Commands run strictly one at a time, so a Pause can't interleave with a fix being stored. */
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private apply(event: LifecycleEvent) {
    return transition(this.snap.lifecycle, event);
  }

  private metrics(): Partial<RecordingSnapshot> {
    const a = this.acc;
    if (!a) return { distanceM: 0, movingTimeS: 0, maxSpeedMps: 0, elevGainM: null, speedAtLastFixMps: 0, lastAcceptedAt: null };
    return {
      distanceM: a.distanceM,
      movingTimeS: Math.round(a.movingMs / 1000),
      maxSpeedMps: a.maxSpeedMps,
      elevGainM: a.elevationGainM,
      speedAtLastFixMps: a.lastAccepted ? a.currentSpeedMps(a.lastAccepted.t) : 0,
      lastAcceptedAt: a.lastAccepted?.t ?? null,
    };
  }

  // ---- loading & recovery ----

  /**
   * Load the in-progress recording (if any) from SQLite. With `detectInterruption`, a session that
   * is RECORDING but whose location service is no longer running was interrupted (process killed,
   * reboot, OEM battery killer): it becomes PAUSED('interrupted') from its last fix so the athlete
   * can Resume or Finish (recovery). Called from the UI at launch; the headless location task
   * loads without detection because receiving fixes proves the service is alive.
   */
  load(detectInterruption: boolean): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = this.serial(async () => {
      const s = await sessionsRepo.findActive();
      let running = false;
      try {
        running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      } catch {
        running = false;
      }
      if (!s) {
        // Orphaned service (e.g. a discard that crashed half-way): stop it.
        if (running) await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
        this.set({ ready: true });
        return;
      }
      const acc = new TrackAccumulator(s.sport);
      const points = await pointsRepo.range(s.id);
      const builder = new RouteSegments();
      for (const p of points) builder.add(p, acc.add(p));
      const routeSegments = toLngLatRuns(builder);
      this.acc = acc;
      this.routeBuilder = builder;
      let lifecycle: LifecycleState = {
        status: s.status,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        pauses: s.pauses,
        pauseReason: s.pauseReason,
        segment: s.segment,
      };
      if (detectInterruption && s.status === 'recording' && !running) {
        const at = s.lastFixAt ?? acc.lastAccepted?.t ?? s.updatedAt;
        lifecycle = transition(lifecycle, { type: 'INTERRUPT', at });
        await sessionsRepo.saveLifecycle(s.id, lifecycle, 'interrupted');
      }
      this.snap = {
        ...this.snap,
        ...this.metrics(),
        ready: true,
        sessionId: s.id,
        sport: s.sport,
        lifecycle,
        route: routeSegments.flat(),
        routeSegments,
      };
      this.listeners.forEach((l) => l());
    });
    return this.loading;
  }

  setAthlete(id: string | null) {
    this.athleteId = id;
  }

  // ---- location input (called by the background task) ----

  /** Stores fixes durably first, then updates live metrics. Safe to call from a headless context. */
  ingest(locations: LocationObjectLike[]) {
    return this.serial(async () => {
      if (!locations.length) return;
      const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
      const last = sorted[sorted.length - 1];
      const lastFix: Fix = { lat: last.coords.latitude, lng: last.coords.longitude, acc: last.coords.accuracy ?? null, t: last.timestamp };
      const id = this.snap.sessionId;
      if (!id || !this.acc) {
        this.set({ lastFix });
        return;
      }
      const stored = await pointsRepo.append(id, sorted.map(toPoint));
      let changed = false;
      for (const p of stored) {
        if (this.routeBuilder.add(p, this.acc.add(p))) changed = true;
      }
      if (changed) {
        const routeSegments = toLngLatRuns(this.routeBuilder);
        this.set({ ...this.metrics(), route: routeSegments.flat(), routeSegments, lastFix });
      } else {
        this.set({ ...this.metrics(), lastFix });
      }
    });
  }

  // ---- PREPARING: GPS warm-up before Start (foreground only, no service) ----

  prepare() {
    return this.serial(async () => {
      if (this.snap.lifecycle.status !== 'idle') return;
      this.set({ lifecycle: this.apply({ type: 'PREPARE' }), error: null });
      const permission = await this.ensurePermission(false);
      // status may have changed while awaiting the permission prompt
      if (permission !== 'granted' || (this.snap.lifecycle.status as string) !== 'preparing') return;
      this.previewSub?.remove();
      this.previewSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (l) => this.set({ lastFix: { lat: l.coords.latitude, lng: l.coords.longitude, acc: l.coords.accuracy ?? null, t: l.timestamp } })
      ).catch(() => null);
    });
  }

  /** Leaving the record screen without starting. */
  cancelPrepare() {
    return this.serial(async () => {
      this.previewSub?.remove();
      this.previewSub = null;
      if (this.snap.lifecycle.status === 'preparing') this.set({ lifecycle: this.apply({ type: 'CANCEL' }) });
    });
  }

  /** Re-checks permissions (e.g. after returning from system settings). */
  refreshPermission() {
    return this.ensurePermission(false);
  }

  private async ensurePermission(request: boolean): Promise<PermissionState> {
    let state: PermissionState;
    try {
      const current = await Location.getForegroundPermissionsAsync();
      const perm = current.granted || !(request || current.canAskAgain) ? current : await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) state = 'denied';
      else state = (await Location.hasServicesEnabledAsync()) ? 'granted' : 'services_off';
    } catch {
      state = 'denied';
    }
    this.set({ permission: state });
    return state;
  }

  // ---- commands ----

  start(sport: string) {
    return this.serial(async () => {
      const status = this.snap.lifecycle.status;
      if (status === 'recording' || status === 'paused') throw new Error('A recording is already in progress.');
      if (!this.athleteId) throw new Error('Sign in to record.');
      const permission = await this.ensurePermission(true);
      if (permission === 'denied') throw new Error('Location permission is required to record.');
      if (permission === 'services_off') throw new Error('Turn on location to record.');
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        // Without it, Android 13+ hides the "recording" notification (the service still runs).
        await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS').catch(() => null);
      }
      this.previewSub?.remove();
      this.previewSub = null;

      const id = Crypto.randomUUID();
      const lifecycle = transition(this.snap.lifecycle, { type: 'START', at: Date.now() });
      // Persist BEFORE starting GPS so the very first fixes have a session to land in.
      await sessionsRepo.create({ id, athleteId: this.athleteId, sport });
      await sessionsRepo.saveLifecycle(id, lifecycle, 'start');
      this.acc = new TrackAccumulator(sport);
      this.routeBuilder = new RouteSegments();
      this.snap = { ...this.snap, ...this.metrics(), sessionId: id, sport, lifecycle, route: [], routeSegments: [], error: null };
      this.listeners.forEach((l) => l());
      try {
        await this.startUpdates(sport);
      } catch (e: any) {
        await sessionsRepo.remove(id);
        this.acc = null;
        this.set({ ...this.metrics(), sessionId: null, lifecycle: INITIAL_LIFECYCLE, route: [], routeSegments: [], error: e?.message ?? 'Could not start GPS' });
        throw e;
      }
    });
  }

  private async startUpdates(sport: string) {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) return;
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 1000,
        // Stream 1Hz fixes continuously. The accumulator filter rejects stationary wander.
        distanceInterval: 0,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: `Recording ${sport.toLowerCase()}`,
          notificationBody: 'GPS is on. Tap to return to your activity.',
          notificationColor: '#F25C19',
          killServiceOnDestroy: false,
        },
      });
    } catch {
      if (!this.previewSub) {
        this.previewSub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
          (l) => {
            this.ingest([l]);
          }
        ).catch(() => null);
      }
    }
  }

  private async stopUpdates() {
    this.previewSub?.remove();
    this.previewSub = null;
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK).catch(() => {});
    }
  }

  pause() {
    return this.serial(async () => {
      const id = this.snap.sessionId;
      if (!id || this.snap.lifecycle.status !== 'recording') return;
      const lifecycle = this.apply({ type: 'PAUSE', at: Date.now() });
      await sessionsRepo.saveLifecycle(id, lifecycle, 'pause');
      // GPS keeps running while paused (live position + status); fixes are not stored (db guard).
      this.set({ lifecycle });
    });
  }

  resume() {
    return this.serial(async () => {
      const id = this.snap.sessionId;
      if (!id || this.snap.lifecycle.status !== 'paused') return;
      const lifecycle = this.apply({ type: 'RESUME', at: Date.now() });
      await sessionsRepo.saveLifecycle(id, lifecycle, 'resume');
      this.set({ lifecycle, error: null });
      try {
        await this.startUpdates(this.snap.sport); // needed after an interruption
      } catch (e: any) {
        this.set({ error: e?.message ?? 'Could not restart GPS' });
      }
    });
  }

  /** What the activity looks like if finished now (Save screen). Pure; doesn't change state. */
  async previewSummary(): Promise<TrackSummary | null> {
    const { lifecycle, sessionId, sport } = this.snap;
    if (!sessionId || (lifecycle.status !== 'recording' && lifecycle.status !== 'paused')) return null;
    const done = transition(lifecycle, { type: 'FINISH', at: Date.now() });
    const acc = new TrackAccumulator(sport);
    for (const p of await pointsRepo.range(sessionId)) acc.add(p);
    return acc.summary({ startedAt: done.startedAt!, finishedAt: done.finishedAt, pauses: done.pauses });
  }

  /**
   * FINISH + save details, atomically from the athlete's point of view: the session is COMPLETED
   * and queued for upload in SQLite, then the engine returns to IDLE. Idempotent: a second call
   * (double tap) finds no active session and returns the same id.
   */
  complete(save: SaveDetails) {
    return this.serial(async () => {
      const id = this.snap.sessionId;
      const status = this.snap.lifecycle.status;
      if (!id || (status !== 'recording' && status !== 'paused')) throw new Error('There is no recording to save.');
      const lifecycle = this.apply({ type: 'FINISH', at: Date.now() });
      await sessionsRepo.saveLifecycle(id, lifecycle, 'finish');
      await sessionsRepo.setSave(id, save);
      await this.stopUpdates();
      this.reset();
      return id;
    });
  }

  discard() {
    return this.serial(async () => {
      const id = this.snap.sessionId;
      if (!id) return;
      await this.stopUpdates();
      await sessionsRepo.remove(id); // the athlete chose to delete it; points go with it
      this.reset();
    });
  }

  private reset() {
    this.acc = null;
    this.routeBuilder = new RouteSegments();
    this.set({ ...this.metrics(), sessionId: null, lifecycle: INITIAL_LIFECYCLE, route: [], routeSegments: [], error: null });
  }
}

export const recordingEngine = new RecordingEngine();
