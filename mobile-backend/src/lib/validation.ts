import { z } from 'zod';
import { MAX_BATCHES, MAX_POINTS_PER_BATCH } from '../../../shared/tracking/batching';

/** Request contracts (ADR-11). Shapes mirror shared/tracking/batching.ts. */

export const SPORTS = ['Run', 'Walk', 'Hike', 'Ride'] as const;
export const VISIBILITY = ['PUBLIC', 'FOLLOWERS_ONLY', 'ONLY_ME'] as const;

const EARLIEST = Date.UTC(2010, 0, 1);
const isoDate = z
  .string()
  .datetime({ offset: true })
  .refine((s) => {
    const t = Date.parse(s);
    return t >= EARLIEST && t <= Date.now() + 24 * 3600_000;
  }, 'date out of range');

const nullableFinite = z.number().finite().nullable();

export const wirePoint = z.tuple([
  z.number().int().positive(), // t (epoch ms)
  z.number().min(-90).max(90), // lat
  z.number().min(-180).max(180), // lng
  nullableFinite, // acc
  nullableFinite, // alt
  nullableFinite, // altAcc
  nullableFinite, // speed
  z.number().int().min(0).max(10_000), // seg
]);

export const uploadStartSchema = z.object({
  clientActivityId: z.string().uuid(),
  sportType: z.enum(SPORTS),
  startTime: isoDate,
});

export const uploadBatchSchema = z.object({
  points: z.array(wirePoint).min(1).max(MAX_POINTS_PER_BATCH),
});

const title = z.string().trim().min(1, 'Title is required').max(100);
const description = z.string().trim().max(2000);

export const uploadCompleteSchema = z
  .object({
    title,
    description: description.optional(),
    sportType: z.enum(SPORTS),
    visibility: z.enum(VISIBILITY),
    startTime: isoDate,
    finishedAt: isoDate,
    pauses: z.array(z.tuple([z.number().int(), z.number().int().nullable()])).max(1000),
    batchCount: z.number().int().min(0).max(MAX_BATCHES),
  })
  .refine((b) => Date.parse(b.finishedAt) >= Date.parse(b.startTime), {
    message: 'finishedAt must not be before startTime',
    path: ['finishedAt'],
  });

export const activityPatchSchema = z
  .object({
    title: title.optional(),
    description: description.nullable().optional(),
    sportType: z.enum(SPORTS).optional(),
    visibility: z.enum(VISIBILITY).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, 'Nothing to update');

/** Legacy single-request create (kept for older app builds). */
export const legacyCreateSchema = z
  .object({
    clientActivityId: z.string().uuid().optional(),
    title,
    description: description.optional(),
    sportType: z.string().trim().min(1).max(50).default('Run'),
    visibility: z.enum(VISIBILITY).default('PUBLIC'),
    startTime: isoDate.optional(),
    distanceMeters: z.number().finite().min(0).max(2_000_000),
    movingTimeSeconds: z.number().int().min(0).max(7 * 86400),
    elapsedTimeSeconds: z.number().int().min(0).max(7 * 86400).optional(),
    elevationGainMeters: z.number().finite().min(0).max(50_000).optional(),
    maxSpeedMps: z.number().finite().min(0).max(100).optional(),
    calories: z.number().finite().min(0).max(50_000).optional(),
    rawPolyline: z.array(z.any()).max(120_000).optional(),
    splits: z.array(z.any()).max(1000).optional(),
    elevationProfile: z.array(z.number()).max(120_000).optional(),
  })
  .passthrough();
