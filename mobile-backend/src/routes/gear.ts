import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { gear } from '../db/schema';
import { getDb } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const gearRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/gear - List athlete's gear
gearRouter.get('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');

  const list = await db
    .select()
    .from(gear)
    .where(eq(gear.athleteId, currentUser.athleteId))
    .orderBy(desc(gear.createdAt));

  const formatted = list.map((g) => {
    const distanceMeters = Number(g.distanceMeters);
    const maxDistanceMeters = Number(g.maxDistanceMeters);
    const usagePercent = Math.min(100, Math.round((distanceMeters / (maxDistanceMeters || 1)) * 100));

    return {
      ...g,
      distanceMeters,
      maxDistanceMeters,
      distanceKm: (distanceMeters / 1000).toFixed(1),
      maxDistanceKm: (maxDistanceMeters / 1000).toFixed(0),
      usagePercent,
      isNearRetirement: usagePercent >= 90,
    };
  });

  return c.json({ gear: formatted, count: formatted.length });
});

// POST /api/v1/gear - Add new shoe or bike
gearRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { name, brand, model, sportType = 'Run', maxDistanceMeters = 500000, isDefault = false } = body;

  if (!name || !brand || !model) {
    return c.json({ error: 'Name, brand, and model are required' }, 400);
  }

  // If set to default, clear previous default for this sport
  if (isDefault) {
    await db
      .update(gear)
      .set({ isDefault: false })
      .where(and(eq(gear.athleteId, currentUser.athleteId), eq(gear.sportType, sportType)));
  }

  const gearId = `gear_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newGear] = await db
    .insert(gear)
    .values({
      id: gearId,
      athleteId: currentUser.athleteId,
      name: name.trim(),
      brand: brand.trim(),
      model: model.trim(),
      sportType,
      distanceMeters: '0',
      maxDistanceMeters: String(maxDistanceMeters),
      isDefault: Boolean(isDefault),
      isRetired: false,
    })
    .returning();

  return c.json({ message: 'Gear added', gear: newGear }, 201);
});

// PATCH /api/v1/gear/:id - Update or retire gear
gearRouter.patch('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { name, isRetired, isDefault, maxDistanceMeters } = body;

  const [existing] = await db
    .select()
    .from(gear)
    .where(and(eq(gear.id, id), eq(gear.athleteId, currentUser.athleteId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Gear not found' }, 404);
  }

  if (isDefault) {
    await db
      .update(gear)
      .set({ isDefault: false })
      .where(and(eq(gear.athleteId, currentUser.athleteId), eq(gear.sportType, existing.sportType)));
  }

  const [updated] = await db
    .update(gear)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(isRetired !== undefined && { isRetired: Boolean(isRetired) }),
      ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
      ...(maxDistanceMeters !== undefined && { maxDistanceMeters: String(maxDistanceMeters) }),
    })
    .where(eq(gear.id, id))
    .returning();

  return c.json({ message: 'Gear updated', gear: updated });
});

// DELETE /api/v1/gear/:id - Delete gear
gearRouter.delete('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [existing] = await db
    .select()
    .from(gear)
    .where(and(eq(gear.id, id), eq(gear.athleteId, currentUser.athleteId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Gear not found' }, 404);
  }

  await db.delete(gear).where(eq(gear.id, id));

  return c.json({ message: 'Gear deleted successfully' });
});
