import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { privacyZones } from '../db/schema';
import { getDb } from '../lib/db';
import { requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const privacyZonesRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/privacy-zones - List user's privacy zones
privacyZonesRouter.get('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');

  const zones = await db
    .select()
    .from(privacyZones)
    .where(eq(privacyZones.athleteId, currentUser.athleteId))
    .orderBy(desc(privacyZones.createdAt));

  const formatted = zones.map((z) => ({
    ...z,
    latitude: Number(z.latitude),
    longitude: Number(z.longitude),
  }));

  return c.json({ privacyZones: formatted, count: formatted.length });
});

// POST /api/v1/privacy-zones - Create a new privacy zone
privacyZonesRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { name, latitude, longitude, radiusMeters = 500, isActive = true } = body;

  if (!name || latitude === undefined || longitude === undefined) {
    return c.json({ error: 'Name, latitude, and longitude are required' }, 400);
  }

  const zoneId = `pz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newZone] = await db
    .insert(privacyZones)
    .values({
      id: zoneId,
      athleteId: currentUser.athleteId,
      name: name.trim(),
      latitude: String(latitude),
      longitude: String(longitude),
      radiusMeters: Number(radiusMeters) || 500,
      isActive: Boolean(isActive),
    })
    .returning();

  return c.json({
    message: 'Privacy zone created successfully',
    privacyZone: {
      ...newZone,
      latitude: Number(newZone.latitude),
      longitude: Number(newZone.longitude),
    },
  }, 201);
});

// PATCH /api/v1/privacy-zones/:id - Update zone
privacyZonesRouter.patch('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { name, radiusMeters, isActive } = body;

  const [existing] = await db
    .select()
    .from(privacyZones)
    .where(and(eq(privacyZones.id, id), eq(privacyZones.athleteId, currentUser.athleteId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Privacy zone not found' }, 404);
  }

  const [updated] = await db
    .update(privacyZones)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(radiusMeters !== undefined && { radiusMeters: Number(radiusMeters) }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    })
    .where(eq(privacyZones.id, id))
    .returning();

  return c.json({
    message: 'Privacy zone updated',
    privacyZone: {
      ...updated,
      latitude: Number(updated.latitude),
      longitude: Number(updated.longitude),
    },
  });
});

// DELETE /api/v1/privacy-zones/:id - Delete zone
privacyZonesRouter.delete('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [existing] = await db
    .select()
    .from(privacyZones)
    .where(and(eq(privacyZones.id, id), eq(privacyZones.athleteId, currentUser.athleteId)))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Privacy zone not found' }, 404);
  }

  await db.delete(privacyZones).where(eq(privacyZones.id, id));

  return c.json({ message: 'Privacy zone deleted' });
});
