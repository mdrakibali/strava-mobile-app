import { and, desc, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, clubs, eventRsvps, groupEvents } from '../db/schema';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { HttpError, notFound, parseBody } from '../lib/http';
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

    // GOING counts per event, aggregated in the database.
    const goingRows = await db
      .select({ eventId: eventRsvps.eventId, n: sql<number>`count(*)::int` })
      .from(eventRsvps)
      .where(eq(eventRsvps.status, 'GOING'))
      .groupBy(eventRsvps.eventId);
    const rsvpCountMap = new Map(goingRows.map((r) => [r.eventId, Number(r.n)]));

    // The viewer's own RSVP per event (was always null before).
    const viewer = c.get('user')?.athleteId;
    const mine = viewer
      ? await db.select().from(eventRsvps).where(eq(eventRsvps.athleteId, viewer))
      : [];
    const myStatus = new Map(mine.map((r) => [r.eventId, r.status]));

    const formatted = eventsList.map((e) => {
      const d = new Date(e.eventDate);
      return {
        id: e.id,
        title: e.title,
        clubName: e.club?.name ?? null,
        sportType: e.sportType,
        dateFormatted: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }),
        timeFormatted: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        meetingPoint: e.meetingPoint,
        distanceMeters: Number(e.distanceMeters || 0),
        eventDate: e.eventDate,
        attendeesCount: rsvpCountMap.get(e.id) || 0,
        rsvpStatus: myStatus.get(e.id) ?? null,
        paceDescription: e.paceDescription ?? null,
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

    const user = c.get('user');
    const myRsvp = user ? attendees.find((a) => a.athleteId === user.athleteId) : null;
    const rsvpStatus = myRsvp ? myRsvp.status : null;
    const goingAttendees = attendees.filter((a) => a.status === 'GOING');
    const attendeesCount = goingAttendees.length;

    return c.json({
      event: {
        ...event,
        attendeesCount,
        rsvpStatus,
      },
      attendees,
    });
  } catch (err: any) {
    console.error('Event detail error:', err);
    return c.json({ error: err.message || 'Failed to fetch event' }, 500);
  }
});

// POST /api/v1/events/:id/rsvp   body: { status: 'GOING' | 'MAYBE' | 'DECLINED' }
// DECLINED removes the RSVP. The call is idempotent: repeating it never changes the count again.
const rsvpSchema = z.object({ status: z.enum(['GOING', 'MAYBE', 'DECLINED']).default('GOING') });

eventsRouter.post('/:id/rsvp', requireAuth, async (c) => {
  const user = c.get('user');
  const eventId = c.req.param('id') ?? '';
  const { status } = await parseBody(c, rsvpSchema);
  const db = getDb(c);

  const [event] = await db
    .select({ id: groupEvents.id })
    .from(groupEvents)
    .where(eq(groupEvents.id, eventId))
    .limit(1);
  if (!event) throw notFound('Event');

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
    .values({ eventId, athleteId: user.athleteId, status })
    .onConflictDoUpdate({ target: [eventRsvps.eventId, eventRsvps.athleteId], set: { status } });
  return c.json({ message: 'RSVP recorded', status, attendeesCount: await goingCount() });
});

const assertClubExists = async (db: ReturnType<typeof getDb>, clubId: string) => {
  const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.id, clubId)).limit(1);
  if (!club) throw new HttpError(400, 'validation_failed', 'That club does not exist');
};

const createEventSchema = z.object({
  title: z.string().trim().min(1).max(120),
  sportType: z.string().trim().min(1).max(50),
  eventDate: z
    .string()
    .datetime({ offset: true })
    .refine((d) => Date.parse(d) > Date.now() - 3600_000, 'Event date must be in the future'),
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
  if (body.clubId) await assertClubExists(db, body.clubId);
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
  await db
    .insert(eventRsvps)
    .values({ eventId: id, athleteId: user.athleteId, status: 'GOING' })
    .onConflictDoNothing();
  return c.json({ message: 'Event created', event }, 201);
});

const updateEventSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    sportType: z.string().trim().min(1).max(50),
    eventDate: z.string().datetime({ offset: true }),
    meetingPoint: z.string().trim().min(1).max(200),
    paceDescription: z.string().trim().max(200).nullable(),
    distanceMeters: z.number().finite().min(0).max(1_000_000).nullable(),
  })
  .partial();

const loadOwnedEvent = async (db: ReturnType<typeof getDb>, eventId: string, athleteId: string) => {
  const [event] = await db.select().from(groupEvents).where(eq(groupEvents.id, eventId)).limit(1);
  if (!event) throw notFound('Event');
  if (event.creatorId !== athleteId)
    throw new HttpError(403, 'forbidden', 'Only the event creator can change this event');
  return event;
};

// PATCH /events/:id — creator only
eventsRouter.patch('/:id', requireAuth, async (c) => {
  const body = await parseBody(c, updateEventSchema);
  const db = getDb(c);
  const eventId = c.req.param('id') ?? '';
  await loadOwnedEvent(db, eventId, c.get('user').athleteId);

  const values: Partial<typeof groupEvents.$inferInsert> = {};
  if (body.title !== undefined) values.title = body.title;
  if (body.sportType !== undefined) values.sportType = body.sportType;
  if (body.eventDate !== undefined) values.eventDate = new Date(body.eventDate);
  if (body.meetingPoint !== undefined) values.meetingPoint = body.meetingPoint;
  if (body.paceDescription !== undefined) values.paceDescription = body.paceDescription;
  if (body.distanceMeters !== undefined)
    values.distanceMeters = body.distanceMeters === null ? null : body.distanceMeters.toFixed(2);

  const [event] = Object.keys(values).length
    ? await db.update(groupEvents).set(values).where(eq(groupEvents.id, eventId)).returning()
    : await db.select().from(groupEvents).where(eq(groupEvents.id, eventId));
  return c.json({ message: 'Event updated', event });
});

// DELETE /events/:id — creator only; RSVPs go with it (ON DELETE CASCADE)
eventsRouter.delete('/:id', requireAuth, async (c) => {
  const db = getDb(c);
  const eventId = c.req.param('id') ?? '';
  await loadOwnedEvent(db, eventId, c.get('user').athleteId);
  await db.delete(groupEvents).where(eq(groupEvents.id, eventId));
  return c.json({ message: 'Event deleted' });
});
