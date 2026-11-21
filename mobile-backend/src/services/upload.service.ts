import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { MAX_BATCHES, missingSeqs } from '../../../shared/tracking/batching';
import { estimateCalories } from '../../../shared/tracking/calories';
import { acceptedPoints, routePoints, summarizeTrack } from '../../../shared/tracking/metrics';
import { fromWire, RawPoint, TrackSummary, WirePoint } from '../../../shared/tracking/types';
import { activities, activityUploadBatches, activityUploads, athletes, privacyZones } from '../db/schema';
import { AppDatabase } from '../lib/db';
import { HttpError, notFound } from '../lib/http';
import { maskPolylineWithPrivacyZones } from '../lib/privacy';
import { uploadCompleteSchema, uploadStartSchema } from '../lib/validation';

type StartInput = z.infer<typeof uploadStartSchema>;
type CompleteInput = z.infer<typeof uploadCompleteSchema>;

const MAX_ELEVATION_SAMPLES = 200;

/**
 * Batch GPS upload (ADR-06). Every operation is idempotent, keyed by
 * (athleteId, clientActivityId[, seq]); the athlete comes from the verified token only, so one
 * athlete can never read or modify another's upload.
 */
export class UploadService {
  constructor(private db: AppDatabase) {}

  private async status(athleteId: string, cid: string) {
    const [upload] = await this.db
      .select()
      .from(activityUploads)
      .where(and(eq(activityUploads.athleteId, athleteId), eq(activityUploads.clientActivityId, cid)))
      .limit(1);
    if (!upload) return null;
    const seqs = await this.db
      .select({ seq: activityUploadBatches.seq })
      .from(activityUploadBatches)
      .where(and(eq(activityUploadBatches.athleteId, athleteId), eq(activityUploadBatches.clientActivityId, cid)))
      .orderBy(asc(activityUploadBatches.seq));
    return {
      clientActivityId: cid,
      status: upload.status as 'OPEN' | 'COMPLETED',
      sportType: upload.sportType,
      receivedSeqs: seqs.map((s) => s.seq),
      activityId: upload.activityId,
    };
  }

  async start(athleteId: string, input: StartInput) {
    const inserted = await this.db
      .insert(activityUploads)
      .values({
        athleteId,
        clientActivityId: input.clientActivityId,
        sportType: input.sportType,
        startTime: new Date(input.startTime),
      })
      .onConflictDoNothing()
      .returning({ cid: activityUploads.clientActivityId });
    const upload = await this.status(athleteId, input.clientActivityId);
    return { created: inserted.length > 0, upload: upload! };
  }

  async get(athleteId: string, cid: string) {
    const upload = await this.status(athleteId, cid);
    if (!upload) throw notFound('Upload');
    return { upload };
  }

  async putBatch(athleteId: string, cid: string, seq: number, points: WirePoint[]) {
    if (!Number.isInteger(seq) || seq < 0 || seq >= MAX_BATCHES)
      throw new HttpError(400, 'invalid_seq', `Batch sequence must be 0..${MAX_BATCHES - 1}`);
    const upload = await this.status(athleteId, cid);
    if (!upload) throw notFound('Upload');

    const existing = upload.receivedSeqs.includes(seq);
    if (upload.status === 'COMPLETED') {
      // Late retry of a batch whose ack was lost: the activity already exists, so just acknowledge.
      return { seq, duplicate: true, completed: true };
    }
    if (existing) return this.ackExisting(athleteId, cid, seq, points.length);

    const inserted = await this.db
      .insert(activityUploadBatches)
      .values({ athleteId, clientActivityId: cid, seq, points, pointCount: points.length })
      .onConflictDoNothing()
      .returning({ seq: activityUploadBatches.seq });
    if (inserted.length === 0) return this.ackExisting(athleteId, cid, seq, points.length);
    await this.db
      .update(activityUploads)
      .set({ updatedAt: new Date() })
      .where(and(eq(activityUploads.athleteId, athleteId), eq(activityUploads.clientActivityId, cid)));
    return { seq, duplicate: false, completed: false };
  }

  private async ackExisting(athleteId: string, cid: string, seq: number, count: number) {
    const [row] = await this.db
      .select({ pointCount: activityUploadBatches.pointCount })
      .from(activityUploadBatches)
      .where(
        and(
          eq(activityUploadBatches.athleteId, athleteId),
          eq(activityUploadBatches.clientActivityId, cid),
          eq(activityUploadBatches.seq, seq)
        )
      );
    if (row && row.pointCount !== count)
      throw new HttpError(409, 'batch_conflict', `Batch ${seq} was already received with different content`);
    return { seq, duplicate: true, completed: false };
  }

  /**
   * Turn the staged batches into an activity. Runs in one transaction with the upload row locked,
   * so concurrent duplicate /complete calls serialize; the unique (athlete_id, client_activity_id)
   * index is the final guard. Returns created=false (HTTP 200) when the activity already exists.
   */
  async complete(athleteId: string, cid: string, input: CompleteInput) {
    return this.db.transaction(async (tx) => {
      const [upload] = await tx
        .select()
        .from(activityUploads)
        .where(and(eq(activityUploads.athleteId, athleteId), eq(activityUploads.clientActivityId, cid)))
        .for('update');
      if (!upload) throw notFound('Upload');

      if (upload.status === 'COMPLETED') {
        const activity = upload.activityId
          ? (await tx.select().from(activities).where(eq(activities.id, upload.activityId)))[0]
          : null;
        // activity null = it was completed and later deleted by its owner; don't resurrect it.
        return { created: false, deleted: !activity, activity: activity ?? null };
      }

      const batches = await tx
        .select({ seq: activityUploadBatches.seq, points: activityUploadBatches.points })
        .from(activityUploadBatches)
        .where(and(eq(activityUploadBatches.athleteId, athleteId), eq(activityUploadBatches.clientActivityId, cid)))
        .orderBy(asc(activityUploadBatches.seq));
      const missing = missingSeqs(
        batches.map((b) => b.seq),
        input.batchCount
      );
      if (missing.length > 0)
        throw new HttpError(409, 'missing_batches', 'Some GPS batches have not been received', { missingSeqs: missing });
      if (batches.some((b) => b.seq >= input.batchCount))
        throw new HttpError(409, 'unexpected_batches', 'More batches were received than batchCount');

      const raw: RawPoint[] = batches.flatMap((b) => (b.points as WirePoint[]).map(fromWire));
      const startedAt = Date.parse(input.startTime);
      const finishedAt = Date.parse(input.finishedAt);
      const summary = summarizeTrack({ sport: input.sportType, points: raw, startedAt, finishedAt, pauses: input.pauses });

      const [athlete] = await tx.select({ weightKg: athletes.weightKg }).from(athletes).where(eq(athletes.id, athleteId));
      const zones = await tx
        .select()
        .from(privacyZones)
        .where(and(eq(privacyZones.athleteId, athleteId), eq(privacyZones.isActive, true)));

      const row = buildActivityRow({
        athleteId,
        clientActivityId: cid,
        input,
        raw,
        summary,
        weightKg: athlete?.weightKg ? Number(athlete.weightKg) : undefined,
        zones: zones.map((z) => ({ ...z, latitude: Number(z.latitude), longitude: Number(z.longitude) })),
      });

      const inserted = await tx.insert(activities).values(row).onConflictDoNothing().returning();
      const activity =
        inserted[0] ??
        (
          await tx
            .select()
            .from(activities)
            .where(and(eq(activities.athleteId, athleteId), eq(activities.clientActivityId, cid)))
        )[0];

      await tx
        .update(activityUploads)
        .set({ status: 'COMPLETED', activityId: activity.id, updatedAt: new Date() })
        .where(and(eq(activityUploads.athleteId, athleteId), eq(activityUploads.clientActivityId, cid)));
      // The track now lives on the activity; staged batches are no longer needed.
      await tx
        .delete(activityUploadBatches)
        .where(and(eq(activityUploadBatches.athleteId, athleteId), eq(activityUploadBatches.clientActivityId, cid)));

      return { created: inserted.length > 0, deleted: false, activity };
    });
  }
}

const pace = (movingS: number, distanceM: number) => {
  if (distanceM < 50 || movingS <= 0) return null;
  const s = Math.round(movingS / (distanceM / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km`;
};

const downsample = (values: number[], max: number) => {
  if (values.length <= max) return values;
  const step = values.length / max;
  return Array.from({ length: max }, (_, i) => values[Math.floor(i * step)]);
};

export const buildActivityRow = (o: {
  athleteId: string;
  clientActivityId: string;
  input: CompleteInput;
  raw: RawPoint[];
  summary: TrackSummary;
  weightKg?: number;
  zones: { latitude: number; longitude: number; radiusMeters: number; isActive: boolean }[];
}): typeof activities.$inferInsert => {
  const { summary: s, input } = o;
  const kept = acceptedPoints(input.sportType, o.raw);
  const drawn = routePoints(input.sportType, o.raw);
  const track = (drawn.length > 0 ? drawn : kept).map((p) => ({ latitude: p.lat, longitude: p.lng, altitude: p.alt, timestamp: p.t, speed: p.speed }));
  return {
    id: crypto.randomUUID(),
    athleteId: o.athleteId,
    clientActivityId: o.clientActivityId,
    title: input.title,
    description: input.description || null,
    sportType: input.sportType,
    visibility: input.visibility,
    startTime: new Date(input.startTime),
    distanceMeters: s.distanceM.toFixed(2),
    movingTimeSeconds: s.movingTimeS,
    elapsedTimeSeconds: Math.max(s.elapsedTimeS, s.movingTimeS),
    elevationGainMeters: s.elevGainM ?? 0,
    averageSpeedMps: s.avgSpeedMps != null ? s.avgSpeedMps.toFixed(2) : null,
    maxSpeedMps: s.maxSpeedMps != null ? s.maxSpeedMps.toFixed(2) : null,
    calories: estimateCalories(input.sportType, s.distanceM, s.movingTimeS, o.weightKg) ?? null,
    relativeEffortScore: null,
    gapFormatted: null,
    rawPolyline: track,
    maskedPolyline: maskPolylineWithPrivacyZones(track, o.zones),
    splits: s.splits.map((sp) => ({
      splitNumber: sp.index, distanceMeters: sp.distanceM, distanceKm: Math.round(sp.distanceM) / 1000,
      movingTimeSeconds: sp.movingTimeS, elapsedTimeSeconds: sp.elapsedTimeS,
      averageSpeedMps: sp.avgSpeedMps, paceFormatted: pace(sp.movingTimeS, sp.distanceM), elevationDeltaMeters: sp.elevDiffM,
    })),
    elevationProfile: s.elevGainM == null ? [] : downsample(kept.filter((p) => p.alt != null).map((p) => Math.round(p.alt!)), MAX_ELEVATION_SAMPLES),
    photos: [],
  };
};
