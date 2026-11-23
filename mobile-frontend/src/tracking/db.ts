import * as SQLite from 'expo-sqlite';
import { LifecycleStatus, PauseInterval, PauseReason, RawPoint } from './shared';

/**
 * On-device store for recordings (ADR-05). Everything needed to survive a process kill lives here:
 * the session row (lifecycle, pauses, save details, sync state), every GPS point, the pause/resume
 * event log, and which upload batches the server has acknowledged.
 *
 * One connection per JS runtime (UI or headless task). Appends use exclusive transactions because
 * the Expo docs warn that withTransactionAsync can capture unrelated concurrent queries.
 */

export type SyncState = 'local' | 'queued' | 'synced' | 'needs_attention';

export interface SaveDetails {
  title: string;
  description: string;
  sportType: string;
  visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';
}

export interface SessionRow {
  id: string;
  athleteId: string;
  sport: string;
  status: LifecycleStatus;
  startedAt: number | null;
  finishedAt: number | null;
  pauses: PauseInterval[];
  pauseReason: PauseReason | null;
  segment: number;
  lastFixAt: number | null;
  pointCount: number;
  save: SaveDetails | null;
  syncState: SyncState;
  uploadStarted: boolean;
  serverActivityId: string | null;
  attempts: number;
  nextAttemptAt: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

const SCHEMA_VERSION = 1;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDb = () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('tracking.db');
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
      if ((row?.user_version ?? 0) < SCHEMA_VERSION) {
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY NOT NULL,
            athlete_id TEXT NOT NULL,
            sport TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at INTEGER,
            finished_at INTEGER,
            pauses TEXT NOT NULL DEFAULT '[]',
            pause_reason TEXT,
            segment INTEGER NOT NULL DEFAULT 0,
            last_fix_at INTEGER,
            point_count INTEGER NOT NULL DEFAULT 0,
            save_details TEXT,
            sync_state TEXT NOT NULL DEFAULT 'local',
            upload_started INTEGER NOT NULL DEFAULT 0,
            server_activity_id TEXT,
            attempts INTEGER NOT NULL DEFAULT 0,
            next_attempt_at INTEGER,
            last_error TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS points (
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            idx INTEGER NOT NULL,
            t INTEGER NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            acc REAL,
            alt REAL,
            alt_acc REAL,
            speed REAL,
            seg INTEGER NOT NULL,
            PRIMARY KEY (session_id, idx),
            UNIQUE (session_id, t)
          );
          CREATE TABLE IF NOT EXISTS session_events (
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            at INTEGER NOT NULL,
            type TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS acked_batches (
            session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
            seq INTEGER NOT NULL,
            acked_at INTEGER NOT NULL,
            PRIMARY KEY (session_id, seq)
          );
          PRAGMA user_version = ${SCHEMA_VERSION};
        `);
      }
      return db;
    })().catch((e) => {
      dbPromise = null;
      throw e;
    });
  }
  return dbPromise;
};

const toSession = (r: any): SessionRow => ({
  id: r.id,
  athleteId: r.athlete_id,
  sport: r.sport,
  status: r.status,
  startedAt: r.started_at,
  finishedAt: r.finished_at,
  pauses: JSON.parse(r.pauses || '[]'),
  pauseReason: r.pause_reason,
  segment: r.segment,
  lastFixAt: r.last_fix_at,
  pointCount: r.point_count,
  save: r.save_details ? JSON.parse(r.save_details) : null,
  syncState: r.sync_state,
  uploadStarted: Boolean(r.upload_started),
  serverActivityId: r.server_activity_id,
  attempts: r.attempts,
  nextAttemptAt: r.next_attempt_at,
  lastError: r.last_error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const sessionsRepo = {
  async create(s: { id: string; athleteId: string; sport: string }) {
    const db = await getDb();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO sessions (id, athlete_id, sport, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      s.id,
      s.athleteId,
      s.sport,
      'idle',
      now,
      now
    );
  },

  async get(id: string) {
    const db = await getDb();
    const r = await db.getFirstAsync('SELECT * FROM sessions WHERE id = ?', id);
    return r ? toSession(r) : null;
  },

  /** The (at most one) recording that is still in progress: recording or paused. */
  async findActive() {
    const db = await getDb();
    const r = await db.getFirstAsync(
      "SELECT * FROM sessions WHERE status IN ('recording','paused') ORDER BY created_at DESC LIMIT 1"
    );
    return r ? toSession(r) : null;
  },

  async listUnsynced(athleteId: string) {
    const db = await getDb();
    const rows = await db.getAllAsync(
      "SELECT * FROM sessions WHERE athlete_id = ? AND status = 'completed' AND sync_state IN ('queued','needs_attention') ORDER BY created_at",
      athleteId
    );
    return rows.map(toSession);
  },

  async saveLifecycle(
    id: string,
    l: {
      status: LifecycleStatus;
      startedAt: number | null;
      finishedAt: number | null;
      pauses: PauseInterval[];
      pauseReason: PauseReason | null;
      segment: number;
    },
    event?: string
  ) {
    const db = await getDb();
    const now = Date.now();
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        'UPDATE sessions SET status = ?, started_at = ?, finished_at = ?, pauses = ?, pause_reason = ?, segment = ?, updated_at = ? WHERE id = ?',
        l.status,
        l.startedAt,
        l.finishedAt,
        JSON.stringify(l.pauses),
        l.pauseReason,
        l.segment,
        now,
        id
      );
      if (event)
        await tx.runAsync(
          'INSERT INTO session_events (session_id, at, type) VALUES (?, ?, ?)',
          id,
          now,
          event
        );
    });
  },

  async setSave(id: string, save: SaveDetails) {
    const db = await getDb();
    await db.runAsync(
      "UPDATE sessions SET save_details = ?, sport = ?, sync_state = 'queued', attempts = 0, next_attempt_at = NULL, last_error = NULL, updated_at = ? WHERE id = ?",
      JSON.stringify(save),
      save.sportType,
      Date.now(),
      id
    );
  },

  async updateSync(
    id: string,
    patch: Partial<
      Pick<
        SessionRow,
        | 'syncState'
        | 'uploadStarted'
        | 'serverActivityId'
        | 'attempts'
        | 'nextAttemptAt'
        | 'lastError'
      >
    >
  ) {
    const cols: string[] = [];
    const vals: (string | number | null)[] = [];
    const map: Record<string, string> = {
      syncState: 'sync_state',
      uploadStarted: 'upload_started',
      serverActivityId: 'server_activity_id',
      attempts: 'attempts',
      nextAttemptAt: 'next_attempt_at',
      lastError: 'last_error',
    };
    for (const [k, v] of Object.entries(patch)) {
      cols.push(`${map[k]} = ?`);
      vals.push(typeof v === 'boolean' ? (v ? 1 : 0) : (v as any));
    }
    if (!cols.length) return;
    const db = await getDb();
    await db.runAsync(
      `UPDATE sessions SET ${cols.join(', ')}, updated_at = ? WHERE id = ?`,
      ...vals,
      Date.now(),
      id
    );
  },

  /** Deletes the session and (cascade) all of its points. Only for discards and old synced data. */
  async remove(id: string) {
    const db = await getDb();
    await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
  },

  /** Retention: points of activities the server confirmed more than `days` ago (summary row kept). */
  async pruneSynced(days = 7) {
    const db = await getDb();
    const cutoff = Date.now() - days * 86_400_000;
    await db.runAsync(
      "DELETE FROM points WHERE session_id IN (SELECT id FROM sessions WHERE sync_state = 'synced' AND updated_at < ?)",
      cutoff
    );
  },
};

export const pointsRepo = {
  /**
   * Append fixes to a session, only while it is RECORDING (checked inside the same transaction, so
   * a fix racing a Pause can't slip in). Duplicate timestamps are ignored (UNIQUE(session_id, t)).
   * Returns the points actually stored, in order.
   */
  async append(sessionId: string, points: Omit<RawPoint, 'seg'>[]): Promise<RawPoint[]> {
    const db = await getDb();
    const stored: RawPoint[] = [];
    await db.withExclusiveTransactionAsync(async (tx) => {
      const s = await tx.getFirstAsync<{ status: string; segment: number; point_count: number }>(
        'SELECT status, segment, point_count FROM sessions WHERE id = ?',
        sessionId
      );
      let lastFix: number | null = null;
      for (const p of points) lastFix = Math.max(lastFix ?? 0, p.t);
      if (lastFix != null)
        await tx.runAsync('UPDATE sessions SET last_fix_at = ? WHERE id = ?', lastFix, sessionId);
      if (!s || s.status !== 'recording') return;
      let idx = s.point_count;
      for (const p of points) {
        const r = await tx.runAsync(
          'INSERT OR IGNORE INTO points (session_id, idx, t, lat, lng, acc, alt, alt_acc, speed, seg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          sessionId,
          idx,
          p.t,
          p.lat,
          p.lng,
          p.acc,
          p.alt,
          p.altAcc,
          p.speed,
          s.segment
        );
        if (r.changes > 0) {
          idx++;
          stored.push({ ...p, seg: s.segment });
        }
      }
      if (idx !== s.point_count)
        await tx.runAsync('UPDATE sessions SET point_count = ? WHERE id = ?', idx, sessionId);
    });
    return stored;
  },

  async range(sessionId: string, from = 0, to = Number.MAX_SAFE_INTEGER): Promise<RawPoint[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT t, lat, lng, acc, alt, alt_acc, speed, seg FROM points WHERE session_id = ? AND idx >= ? AND idx < ? ORDER BY idx',
      sessionId,
      from,
      to
    );
    return rows.map((r) => ({
      t: r.t,
      lat: r.lat,
      lng: r.lng,
      acc: r.acc,
      alt: r.alt,
      altAcc: r.alt_acc,
      speed: r.speed,
      seg: r.seg,
    }));
  },
};

export const batchesRepo = {
  async acked(sessionId: string): Promise<Set<number>> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ seq: number }>(
      'SELECT seq FROM acked_batches WHERE session_id = ?',
      sessionId
    );
    return new Set(rows.map((r) => r.seq));
  },
  async ack(sessionId: string, seqs: number[]) {
    if (!seqs.length) return;
    const db = await getDb();
    const now = Date.now();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const seq of seqs)
        await tx.runAsync(
          'INSERT OR IGNORE INTO acked_batches (session_id, seq, acked_at) VALUES (?, ?, ?)',
          sessionId,
          seq,
          now
        );
    });
  },
  async unack(sessionId: string, seqs: number[]) {
    const db = await getDb();
    for (const seq of seqs)
      await db.runAsync(
        'DELETE FROM acked_batches WHERE session_id = ? AND seq = ?',
        sessionId,
        seq
      );
  },
  async reset(sessionId: string) {
    const db = await getDb();
    await db.runAsync('DELETE FROM acked_batches WHERE session_id = ?', sessionId);
  },
};
