import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, clubs, eventRsvps, groupEvents } from '../db/schema';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { parseBody } from '../lib/http';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const eventsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/events
eventsRouter.get('/', optionalAuth, async (c) => {
  try {
    const db = getDb(c);

    const eventsList = await db
      .select({
        id: groupEvents.id,
        title: groupEvents.title,
        sportType: groupEvents.sportType,
        meetingPoint: groupEvents.meetingPoint,
        paceDescription: groupEvents.paceDescription,
        distanceMeters: groupEvents.distanceMeters,
        eventDate: groupEvents.eventDate,
        createdAt: groupEvents.createdAt,
        club: {
          id: clubs.id,
          name: clubs.name,
          avatarUrl: clubs.avatarUrl,
        },
        creator: {
          id: athletes.id,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(groupEvents)
      .leftJoin(clubs, eq(groupEvents.clubId, clubs.id))
      .leftJoin(athletes, eq(groupEvents.creatorId, athletes.id))
      .orderBy(desc(groupEvents.eventDate));

    // Get RSVP counts for all events
    const allRsvps = await db.select().from(eventRsvps).where(eq(eventRsvps.status, 'GOING'));
    const rsvpCountMap = new Map<string, number>();
    for (const r of allRsvps) {
      rsvpCountMap.set(r.eventId, (rsvpCountMap.get(r.eventId) || 0) + 1);
    }

    // The viewer's own RSVP per event (was always null before).
    const viewer = c.get('user')?.athleteId;
    const mine = viewer ? await db.select().from(eventRsvps).where(eq(eventRsvps.athleteId, viewer)) : [];
    const myStatus = new Map(mine.map((r) => [r.eventId, r.status]));

    const formatted = eventsList.map((e) => {
      const d = new Date(e.eventDate);
      return {
        id: e.id,
        title: e.title,
        clubName: e.club?.name || 'Community Club',
        sportType: e.sportType,
        dateFormatted: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        timeFormatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        meetingPoint: e.meetingPoint,
        distanceMeters: Number(e.distanceMeters || 0),
        eventDate: e.eventDate,
        attendeesCount: rsvpCountMap.get(e.id) || 0,
        rsvpStatus: myStatus.get(e.id) ?? null,
        paceDescription: e.paceDescription || 'All paces welcome',
      };
    });

    return c.json({ events: formatted });
  } catch (err: any) {
    console.error('Events list error:', err);
    return c.json({ error: err.message || 'Failed to fetch events' }, 500);
  }
});

// GET /api/v1/events/:id
eventsRouter.get('/:id', optionalAuth, async (c) => {
  try {
    const id = c.req.param('id');
    if (!id) {
      return c.json({ error: 'Event ID is required' }, 400);
    }
    const db = getDb(c);

    const [event] = await db
      .select({
        id: groupEvents.id,
        title: groupEvents.title,
        sportType: groupEvents.sportType,
        meetingPoint: groupEvents.meetingPoint,
        paceDescription: groupEvents.paceDescription,
        distanceMeters: groupEvents.distanceMeters,
        eventDate: groupEvents.eventDate,
        createdAt: groupEvents.createdAt,
        club: {
          id: clubs.id,
          name: clubs.name,
          avatarUrl: clubs.avatarUrl,
        },
        creator: {
          id: athletes.id,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(groupEvents)
      .leftJoin(clubs, eq(groupEvents.clubId, clubs.id))
      .leftJoin(athletes, eq(groupEvents.creatorId, athletes.id))
      .where(eq(groupEvents.id, id))
      .limit(1);

    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    // Get attendees
    const attendees = await db
      .select({
        athleteId: eventRsvps.athleteId,
        status: eventRsvps.status,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
      })
      .from(eventRsvps)
      .innerJoin(athletes, eq(eventRsvps.athleteId, athletes.id))
      .where(eq(eventRsvps.eventId, id));

    return c.json({ event, attendees });
  } catch (err: any) {
    console.error('Event detail error:', err);
    return c.json({ error: err.message || 'Failed to fetch event' }, 500);
  }
});

// POST /api/v1/events/:id/rsvp
eventsRouter.post('/:id/rsvp', requireAuth, async (c) => {
  try {
    const user = c.get('user');
    const eventId = c.req.param('id');
    if (!eventId) {
      return c.json({ error: 'Event ID is required' }, 400);
    }
    const { status = 'GOING' } = await c.req.json().catch(() => ({}));

    const db = getDb(c);

    const goingCount = async () => {
      const [res] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, 'GOING')));
      return Number(res?.count || 0);
    };

    if (status === 'DECLINED') {
      await db
        .delete(eventRsvps)
        .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.athleteId, user.athleteId)));
      return c.json({ message: 'RSVP removed', status: null, attendeesCount: await goingCount() });
    }

    await db
      .insert(eventRsvps)
      .values({
        eventId,
        athleteId: user.athleteId,
        status,
      })
      .onConflictDoUpdate({
        target: [eventRsvps.eventId, eventRsvps.athleteId],
        set: { status },
      });
    return c.json({ message: 'RSVP recorded', status, attendeesCount: await goingCount() });
  } catch (err: any) {
    console.error('RSVP error:', err);
    return c.json({ error: err.message || 'Failed to record RSVP' }, 500);
  }
});

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sportType: z.string().trim().min(1).max(50),
  eventDate: z.string().datetime({ offset: true }).refine((d) => Date.parse(d) > Date.now() - 3600_000, 'Event date must be in the future'),
  meetingPoint: z.string().trim().min(1).max(200),
  paceDescription: z.string().trim().max(200).optional(),
  distanceMeters: z.number().finite().min(0).max(1_000_000).optional(),
  clubId: z.string().max(100).optional(),
});

// POST /events — create a group event; the creator is automatically going.
eventsRouter.post('/', requireAuth, async (c) => {
  const body = await parseBody(c, createEventSchema);
  const db = getDb(c);
  const user = c.get('user');
  const id = `evt_${crypto.randomUUID()}`;
  const [event] = await db
    .insert(groupEvents)
    .values({
      id,
      title: body.title,
      sportType: body.sportType,
      clubId: body.clubId ?? null,
      creatorId: user.athleteId,
      meetingPoint: body.meetingPoint,
      paceDescription: body.paceDescription ?? null,
      distanceMeters: body.distanceMeters != null ? body.distanceMeters.toFixed(2) : null,
      eventDate: new Date(body.eventDate),
    })
    .returning();
  await db.insert(eventRsvps).values({ eventId: id, athleteId: user.athleteId, status: 'GOING' }).onConflictDoNothing();
  return c.json({ message: 'Event created', event }, 201);
});
