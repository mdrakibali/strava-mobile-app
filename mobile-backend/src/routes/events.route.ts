import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { athletes, clubs, eventRsvps, groupEvents } from '../db/schema';
import { getDb } from '../lib/db';
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
        attendeesCount: rsvpCountMap.get(e.id) || 1,
        rsvpStatus: null,
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

    const existing = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.athleteId, user.athleteId)))
      .limit(1);

    if (existing.length > 0) {
      if (status === 'DECLINED') {
        await db
          .delete(eventRsvps)
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.athleteId, user.athleteId)));
        return c.json({ message: 'RSVP removed', status: null });
      } else {
        await db
          .update(eventRsvps)
          .set({ status })
          .where(and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.athleteId, user.athleteId)));
        return c.json({ message: 'RSVP updated', status });
      }
    } else {
      await db.insert(eventRsvps).values({
        eventId,
        athleteId: user.athleteId,
        status,
      });
      return c.json({ message: 'RSVP recorded', status });
    }
  } catch (err: any) {
    console.error('RSVP error:', err);
    return c.json({ error: err.message || 'Failed to record RSVP' }, 500);
  }
});
