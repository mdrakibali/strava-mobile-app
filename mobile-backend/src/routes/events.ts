import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { athletes, clubs, eventRsvps, groupEvents } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const eventsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/events - List group events
eventsRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const clubId = c.req.query('clubId');

  let query = db
    .select({
      id: groupEvents.id,
      title: groupEvents.title,
      sportType: groupEvents.sportType,
      meetingPoint: groupEvents.meetingPoint,
      paceDescription: groupEvents.paceDescription,
      distanceMeters: groupEvents.distanceMeters,
      eventDate: groupEvents.eventDate,
      clubId: groupEvents.clubId,
      createdAt: groupEvents.createdAt,
      creator: {
        id: athletes.id,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
      },
    })
    .from(groupEvents)
    .innerJoin(athletes, eq(groupEvents.creatorId, athletes.id))
    .orderBy(desc(groupEvents.eventDate));

  if (clubId) {
    query = query.where(eq(groupEvents.clubId, clubId)) as any;
  }

  const list = await query.limit(30);

  const enriched = await Promise.all(
    list.map(async (ev) => {
      const [rsvpsCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eventRsvps)
        .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.status, 'GOING')));

      let userRsvpStatus = null;
      if (currentUser) {
        const [rsvp] = await db
          .select({ status: eventRsvps.status })
          .from(eventRsvps)
          .where(and(eq(eventRsvps.eventId, ev.id), eq(eventRsvps.athleteId, currentUser.athleteId)))
          .limit(1);
        userRsvpStatus = rsvp?.status || null;
      }

      return {
        ...ev,
        distanceMeters: ev.distanceMeters ? Number(ev.distanceMeters) : null,
        goingCount: Number(rsvpsCountRow?.count || 0),
        userRsvpStatus,
      };
    })
  );

  return c.json({ events: enriched, count: enriched.length });
});

// GET /api/v1/events/:id - Event details + attendee list
eventsRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [ev] = await db
    .select({
      id: groupEvents.id,
      title: groupEvents.title,
      sportType: groupEvents.sportType,
      meetingPoint: groupEvents.meetingPoint,
      paceDescription: groupEvents.paceDescription,
      distanceMeters: groupEvents.distanceMeters,
      eventDate: groupEvents.eventDate,
      clubId: groupEvents.clubId,
      createdAt: groupEvents.createdAt,
      creator: {
        id: athletes.id,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
      },
    })
    .from(groupEvents)
    .innerJoin(athletes, eq(groupEvents.creatorId, athletes.id))
    .where(eq(groupEvents.id, id))
    .limit(1);

  if (!ev) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Fetch attendees
  const attendees = await db
    .select({
      athleteId: eventRsvps.athleteId,
      status: eventRsvps.status,
      createdAt: eventRsvps.createdAt,
      displayName: athletes.displayName,
      username: athletes.username,
      avatarUrl: athletes.avatarUrl,
    })
    .from(eventRsvps)
    .innerJoin(athletes, eq(eventRsvps.athleteId, athletes.id))
    .where(eq(eventRsvps.eventId, id));

  const userRsvp = currentUser
    ? attendees.find((a) => a.athleteId === currentUser.athleteId)?.status || null
    : null;

  return c.json({
    event: {
      ...ev,
      distanceMeters: ev.distanceMeters ? Number(ev.distanceMeters) : null,
      goingCount: attendees.filter((a) => a.status === 'GOING').length,
      userRsvpStatus: userRsvp,
    },
    attendees,
  });
});

// POST /api/v1/events - Create group event
eventsRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { title, sportType = 'Run', clubId, meetingPoint, paceDescription, distanceMeters, eventDate } = body;

  if (!title || !meetingPoint || !eventDate) {
    return c.json({ error: 'Title, meeting point, and event date are required' }, 400);
  }

  const eventId = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newEvent] = await db
    .insert(groupEvents)
    .values({
      id: eventId,
      title: title.trim(),
      sportType,
      clubId: clubId || null,
      creatorId: currentUser.athleteId,
      meetingPoint: meetingPoint.trim(),
      paceDescription: paceDescription || null,
      distanceMeters: distanceMeters ? String(distanceMeters) : null,
      eventDate: new Date(eventDate),
    })
    .returning();

  // Auto RSVP creator as GOING
  await db.insert(eventRsvps).values({
    eventId,
    athleteId: currentUser.athleteId,
    status: 'GOING',
  });

  return c.json({ message: 'Event created', event: newEvent }, 201);
});

// POST /api/v1/events/:id/rsvp - RSVP to event
eventsRouter.post('/:id/rsvp', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { status = 'GOING' } = body; // GOING, MAYBE, DECLINED

  const [ev] = await db.select().from(groupEvents).where(eq(groupEvents.id, id)).limit(1);

  if (!ev) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, id), eq(eventRsvps.athleteId, currentUser.athleteId)))
    .limit(1);

  if (existing) {
    await db
      .update(eventRsvps)
      .set({ status })
      .where(and(eq(eventRsvps.eventId, id), eq(eventRsvps.athleteId, currentUser.athleteId)));
  } else {
    await db.insert(eventRsvps).values({
      eventId: id,
      athleteId: currentUser.athleteId,
      status,
    });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.eventId, id), eq(eventRsvps.status, 'GOING')));

  return c.json({
    message: `RSVP updated to ${status}`,
    status,
    goingCount: Number(countRow?.count || 0),
  });
});

