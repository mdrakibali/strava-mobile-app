import { desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, trainingGoals } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth } from '../middleware/auth';
import { Env } from '../types';

export const goalsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/goals
goalsRouter.get('/', optionalAuth, async (c) => {
  try {
    const user = c.get('user' as any);
    const db = getDb(c.env);

    let athleteId = user?.id;
    if (!athleteId) {
      const [firstAthlete] = await db.select({ id: athletes.id }).from(athletes).limit(1);
      athleteId = firstAthlete?.id;
    }

    if (!athleteId) {
      return c.json({ goals: [] });
    }

    const userGoals = await db
      .select()
      .from(trainingGoals)
      .where(eq(trainingGoals.athleteId, athleteId))
      .orderBy(desc(trainingGoals.createdAt));

    return c.json({
      goals: userGoals.map((g) => ({
        id: g.id,
        title: g.title,
        sportType: g.sportType,
        targetValue: parseFloat(g.targetValue) || 0,
        currentValue: 0,
        unit: g.unit,
        period: g.period,
      })),
    });
  } catch (err: any) {
    console.error('Goals fetch error:', err);
    return c.json({ error: err.message || 'Failed to fetch goals' }, 500);
  }
});

// POST /api/v1/goals
goalsRouter.post('/', optionalAuth, async (c) => {
  try {
    const user = c.get('user' as any);
    const body = await c.req.json();
    const db = getDb(c.env);

    let athleteId = user?.id;
    if (!athleteId) {
      const [firstAthlete] = await db.select({ id: athletes.id }).from(athletes).limit(1);
      athleteId = firstAthlete?.id;
    }

    if (!athleteId) {
      return c.json({ error: 'Athlete account required' }, 401);
    }

    const { title, targetValue, unit = 'km', period = 'WEEKLY', sportType = 'Run' } = body;

    if (!title || targetValue === undefined) {
      return c.json({ error: 'Title and targetValue are required' }, 400);
    }

    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const [newGoal] = await db
      .insert(trainingGoals)
      .values({
        id: goalId,
        athleteId,
        title,
        targetValue: String(targetValue),
        unit,
        period,
        sportType,
      })
      .returning();

    return c.json(
      {
        goal: {
          id: newGoal.id,
          title: newGoal.title,
          sportType: newGoal.sportType,
          targetValue: parseFloat(newGoal.targetValue) || 0,
          currentValue: 0,
          unit: newGoal.unit,
          period: newGoal.period,
        },
      },
      201
    );
  } catch (err: any) {
    console.error('Goal create error:', err);
    return c.json({ error: err.message || 'Failed to create goal' }, 500);
  }
});

// DELETE /api/v1/goals/:id
goalsRouter.delete('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Goal ID is required' }, 400);
    }
    const db = getDb(c.env);

    await db.delete(trainingGoals).where(eq(trainingGoals.id, id));

    return c.json({ success: true, message: 'Goal deleted' });
  } catch (err: any) {
    console.error('Goal delete error:', err);
    return c.json({ error: err.message || 'Failed to delete goal' }, 500);
  }
});
