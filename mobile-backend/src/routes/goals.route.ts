import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { activities, trainingGoals } from '../db/schema';
import { getDb } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const goalsRouter = new Hono<{ Bindings: Env }>();

// Goals are private to their owner. There is deliberately no "first athlete" fallback: an
// unauthenticated request must never read or write anyone's goals.
goalsRouter.use('*', requireAuth);

const PERIODS = ['WEEKLY', 'MONTHLY', 'ANNUAL'] as const;
type Period = (typeof PERIODS)[number];

const createSchema = z.object({
  title: z.string().trim().min(1).max(100),
  targetValue: z.coerce.number().finite().positive().max(1_000_000),
  unit: z.enum(['km']).default('km'),
  period: z.enum(PERIODS).default('WEEKLY'),
  sportType: z.enum(['Run', 'Walk', 'Hike', 'Ride']).default('Run'),
});

/** Start of the current period in UTC (weeks start on Monday). */
export const periodStart = (period: Period, now = new Date()): Date => {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === 'ANNUAL') return new Date(Date.UTC(y, 0, 1));
  if (period === 'MONTHLY') return new Date(Date.UTC(y, m, 1));
  const midnight = Date.UTC(y, m, now.getUTCDate());
  const sinceMonday = (now.getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * 86_400_000);
};

type GoalRow = typeof trainingGoals.$inferSelect;

/** Real progress: km of the athlete's own saved activities of the goal's sport inside the period. */
const progressKm = async (db: ReturnType<typeof getDb>, athleteId: string, goal: GoalRow) => {
  const [row] = await db
    .select({ meters: sql<string>`coalesce(sum(${activities.distanceMeters}), 0)` })
    .from(activities)
    .where(
      and(
        eq(activities.athleteId, athleteId),
        eq(activities.sportType, goal.sportType),
        gte(activities.startTime, periodStart(goal.period as Period))
      )
    );
  return Math.round((Number(row?.meters ?? 0) / 1000) * 10) / 10;
};

const toDto = (g: GoalRow, currentValue: number) => ({
  id: g.id,
  title: g.title,
  sportType: g.sportType,
  targetValue: parseFloat(g.targetValue) || 0,
  currentValue,
  unit: g.unit,
  period: g.period,
});

// GET /api/v1/goals
goalsRouter.get('/', async (c) => {
  const user = c.get('user' as any) as { athleteId: string };
  const db = getDb(c);
  const rows = await db
    .select()
    .from(trainingGoals)
    .where(eq(trainingGoals.athleteId, user.athleteId))
    .orderBy(desc(trainingGoals.createdAt));
  const goals = await Promise.all(
    rows.map(async (g) => toDto(g, await progressKm(db, user.athleteId, g)))
  );
  return c.json({ goals });
});

// POST /api/v1/goals
goalsRouter.post('/', async (c) => {
  const user = c.get('user' as any) as { athleteId: string };
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'Invalid goal', code: 'validation_error' }, 400);
  const { title, targetValue, unit, period, sportType } = parsed.data;
  const db = getDb(c);

  const [goal] = await db
    .insert(trainingGoals)
    .values({
      id: `goal_${crypto.randomUUID()}`,
      athleteId: user.athleteId,
      title,
      targetValue: String(targetValue),
      unit,
      period,
      sportType,
    })
    .returning();
  return c.json({ goal: toDto(goal, await progressKm(db, user.athleteId, goal)) }, 201);
});

// DELETE /api/v1/goals/:id — owner only
goalsRouter.delete('/:id', async (c) => {
  const user = c.get('user' as any) as { athleteId: string };
  const db = getDb(c);
  const deleted = await db
    .delete(trainingGoals)
    .where(
      and(eq(trainingGoals.id, c.req.param('id')), eq(trainingGoals.athleteId, user.athleteId))
    )
    .returning({ id: trainingGoals.id });
  if (deleted.length === 0) return c.json({ error: 'Goal not found', code: 'not_found' }, 404);
  return c.json({ success: true, message: 'Goal deleted' });
});
