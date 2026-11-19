import { Hono } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  activities,
  athletes,
  challengeParticipants,
  challenges,
  comments,
  gear,
  kudos,
  notifications,
  privacyZones,
} from '../db/schema';
import { getDb } from '../lib/db';
import { LatLngPoint, maskPolylineWithPrivacyZones } from '../lib/privacy';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const activitiesRouter = new Hono<{ Bindings: Env }>();

// POST /api/v1/activities - Upload a newly recorded or imported activity
activitiesRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();

  const {
    title,
    description,
    sportType = 'Run',
    visibility = 'PUBLIC',
    startTime = new Date().toISOString(),
    distanceMeters = 0,
    movingTimeSeconds = 0,
    elapsedTimeSeconds = movingTimeSeconds,
    elevationGainMeters = 0,
    averageSpeedMps,
    maxSpeedMps,
    averageHeartRate,
    maxHeartRate,
    calories,
    rawPolyline = [],
    splits = [],
    elevationProfile = [],
    gearId,
    photos = [],
  } = body;

  if (!title) {
    return c.json({ error: 'Activity title is required' }, 400);
  }

  // 1. Fetch user's active privacy zones to mask coordinates
  const userZones = await db
    .select({
      latitude: sql<number>`CAST(${privacyZones.latitude} AS DOUBLE PRECISION)`,
      longitude: sql<number>`CAST(${privacyZones.longitude} AS DOUBLE PRECISION)`,
      radiusMeters: privacyZones.radiusMeters,
      isActive: privacyZones.isActive,
    })
    .from(privacyZones)
    .where(and(eq(privacyZones.athleteId, currentUser.athleteId), eq(privacyZones.isActive, true)));

  // 2. Perform server-side coordinate masking
  const maskedPolyline = maskPolylineWithPrivacyZones(rawPolyline as LatLngPoint[], userZones);

  // 3. Compute relative effort score and GAP pace estimate
  const avgSpeed = averageSpeedMps || (movingTimeSeconds > 0 ? distanceMeters / movingTimeSeconds : 0);
  const paceSecondsPerKm = avgSpeed > 0 ? 1000 / avgSpeed : 0;
  const paceMinutes = Math.floor(paceSecondsPerKm / 60);
  const paceSeconds = Math.floor(paceSecondsPerKm % 60);
  const gapFormatted = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds} /km`;

  const relativeEffortScore = averageHeartRate
    ? Math.min(100, Math.round((averageHeartRate / 185) * (movingTimeSeconds / 60) * 1.5))
    : Math.min(100, Math.round((movingTimeSeconds / 1800) * 35));

  const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 4. Insert into database
  const [newActivity] = await db
    .insert(activities)
    .values({
      id: activityId,
      athleteId: currentUser.athleteId,
      title: title.trim(),
      description: description?.trim() || null,
      sportType,
      visibility,
      startTime: new Date(startTime),
      distanceMeters: String(distanceMeters),
      movingTimeSeconds,
      elapsedTimeSeconds: elapsedTimeSeconds || movingTimeSeconds,
      elevationGainMeters,
      averageSpeedMps: String(avgSpeed.toFixed(2)),
      maxSpeedMps: maxSpeedMps ? String(maxSpeedMps.toFixed(2)) : null,
      averageHeartRate: averageHeartRate || null,
      maxHeartRate: maxHeartRate || null,
      calories: calories || Math.round(distanceMeters * 0.06),
      relativeEffortScore,
      gapFormatted,
      rawPolyline,
      maskedPolyline,
      splits,
      elevationProfile,
      photos,
      gearId: gearId || null,
    })
    .returning();

  // 5. Update Gear mileage if gearId attached
  if (gearId) {
    await db
      .update(gear)
      .set({
        distanceMeters: sql`${gear.distanceMeters} + ${distanceMeters}`,
      })
      .where(and(eq(gear.id, gearId), eq(gear.athleteId, currentUser.athleteId)));
  }

  // 6. Update Challenge Progress for user
  try {
    const userChallenges = await db
      .select({
        challengeId: challengeParticipants.challengeId,
        currentMeters: sql<number>`CAST(${challengeParticipants.currentMeters} AS DOUBLE PRECISION)`,
        targetMeters: sql<number>`CAST(${challenges.targetMeters} AS DOUBLE PRECISION)`,
        isCompleted: challengeParticipants.isCompleted,
        challengeTitle: challenges.title,
      })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(
        and(
          eq(challengeParticipants.athleteId, currentUser.athleteId),
          eq(challengeParticipants.isCompleted, false)
        )
      );

    for (const uc of userChallenges) {
      const updatedMeters = uc.currentMeters + Number(distanceMeters);
      const isNowCompleted = updatedMeters >= uc.targetMeters;

      await db
        .update(challengeParticipants)
        .set({
          currentMeters: String(updatedMeters),
          isCompleted: isNowCompleted,
          completedAt: isNowCompleted ? new Date() : null,
        })
        .where(
          and(
            eq(challengeParticipants.challengeId, uc.challengeId),
            eq(challengeParticipants.athleteId, currentUser.athleteId)
          )
        );

      if (isNowCompleted) {
        await db.insert(notifications).values({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientId: currentUser.athleteId,
          actorId: currentUser.athleteId,
          actionType: 'CHALLENGE_WON',
          targetActivityId: activityId,
          message: `Congratulations! You completed the challenge "${uc.challengeTitle}"!`,
        });
      }
    }
  } catch (err) {
    console.warn('Challenge progress update error:', err);
  }

  return c.json(
    {
      message: 'Activity saved successfully',
      activity: newActivity,
    },
    201
  );
});

// GET /api/v1/activities - List activities with optional athlete filter
activitiesRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const athleteId = c.req.query('athleteId');
  const sportType = c.req.query('sportType');
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 20));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);

  let query = db
    .select({
      id: activities.id,
      title: activities.title,
      description: activities.description,
      sportType: activities.sportType,
      visibility: activities.visibility,
      startTime: activities.startTime,
      distanceMeters: activities.distanceMeters,
      movingTimeSeconds: activities.movingTimeSeconds,
      elapsedTimeSeconds: activities.elapsedTimeSeconds,
      elevationGainMeters: activities.elevationGainMeters,
      averageSpeedMps: activities.averageSpeedMps,
      maxSpeedMps: activities.maxSpeedMps,
      averageHeartRate: activities.averageHeartRate,
      calories: activities.calories,
      relativeEffortScore: activities.relativeEffortScore,
      gapFormatted: activities.gapFormatted,
      maskedPolyline: activities.maskedPolyline,
      photos: activities.photos,
      createdAt: activities.createdAt,
      athlete: {
        id: athletes.id,
        username: athletes.username,
        displayName: athletes.displayName,
        avatarUrl: athletes.avatarUrl,
        city: athletes.city,
      },
    })
    .from(activities)
    .innerJoin(athletes, eq(activities.athleteId, athletes.id))
    .orderBy(desc(activities.startTime))
    .limit(limit)
    .offset(offset);

  if (athleteId) {
    query = query.where(eq(activities.athleteId, athleteId)) as any;
  }

  const list = await query;

  // Enrich with kudos count & current user kudos status
  const enriched = await Promise.all(
    list.map(async (act) => {
      const [kudosCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(kudos)
        .where(eq(kudos.activityId, act.id));

      const [commentsCountRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.activityId, act.id));

      let hasKudos = false;
      if (currentUser) {
        const [userKudos] = await db
          .select()
          .from(kudos)
          .where(and(eq(kudos.activityId, act.id), eq(kudos.athleteId, currentUser.athleteId)))
          .limit(1);
        hasKudos = Boolean(userKudos);
      }

      return {
        ...act,
        kudosCount: Number(kudosCountRow?.count || 0),
        commentsCount: Number(commentsCountRow?.count || 0),
        hasKudos,
      };
    })
  );

  return c.json({ activities: enriched, count: enriched.length });
});

// GET /api/v1/activities/:id - Activity details
activitiesRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [activity] = await db
    .select({
      id: activities.id,
      athleteId: activities.athleteId,
      title: activities.title,
      description: activities.description,
      sportType: activities.sportType,
      visibility: activities.visibility,
      startTime: activities.startTime,
      distanceMeters: activities.distanceMeters,
      movingTimeSeconds: activities.movingTimeSeconds,
      elapsedTimeSeconds: activities.elapsedTimeSeconds,
      elevationGainMeters: activities.elevationGainMeters,
      averageSpeedMps: activities.averageSpeedMps,
      maxSpeedMps: activities.maxSpeedMps,
      averageHeartRate: activities.averageHeartRate,
      maxHeartRate: activities.maxHeartRate,
      calories: activities.calories,
      relativeEffortScore: activities.relativeEffortScore,
      gapFormatted: activities.gapFormatted,
      rawPolyline: activities.rawPolyline,
      maskedPolyline: activities.maskedPolyline,
      splits: activities.splits,
      elevationProfile: activities.elevationProfile,
      photos: activities.photos,
      gearId: activities.gearId,
      createdAt: activities.createdAt,
      athlete: {
        id: athletes.id,
        username: athletes.username,
        displayName: athletes.displayName,
        avatarUrl: athletes.avatarUrl,
        city: athletes.city,
        country: athletes.country,
      },
    })
    .from(activities)
    .innerJoin(athletes, eq(activities.athleteId, athletes.id))
    .where(eq(activities.id, id))
    .limit(1);

  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  const isOwner = currentUser && currentUser.athleteId === activity.athleteId;

  // Mask raw polyline if requester is not author
  const safeActivity = {
    ...activity,
    rawPolyline: isOwner ? activity.rawPolyline : null,
  };

  // Get kudos count & check if viewer gave kudos
  const [kudosCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(kudos)
    .where(eq(kudos.activityId, id));

  let hasKudos = false;
  if (currentUser) {
    const [userKudos] = await db
      .select()
      .from(kudos)
      .where(and(eq(kudos.activityId, id), eq(kudos.athleteId, currentUser.athleteId)))
      .limit(1);
    hasKudos = Boolean(userKudos);
  }

  // Get comments with author details
  const activityComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      parentCommentId: comments.parentCommentId,
      createdAt: comments.createdAt,
      author: {
        id: athletes.id,
        username: athletes.username,
        displayName: athletes.displayName,
        avatarUrl: athletes.avatarUrl,
      },
    })
    .from(comments)
    .innerJoin(athletes, eq(comments.athleteId, athletes.id))
    .where(eq(comments.activityId, id))
    .orderBy(comments.createdAt);

  return c.json({
    activity: safeActivity,
    kudosCount: Number(kudosCountRow?.count || 0),
    hasKudos,
    comments: activityComments,
    commentsCount: activityComments.length,
    isOwner,
  });
});

// PATCH /api/v1/activities/:id - Update activity title/description/visibility
activitiesRouter.patch('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();

  const [existing] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  if (existing.athleteId !== currentUser.athleteId) {
    return c.json({ error: 'Unauthorized to edit this activity' }, 403);
  }

  const { title, description, visibility, gearId, excludeFromFeed } = body;

  const [updated] = await db
    .update(activities)
    .set({
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(visibility !== undefined && { visibility }),
      ...(gearId !== undefined && { gearId }),
      ...(excludeFromFeed !== undefined && { excludeFromFeed }),
      updatedAt: new Date(),
    })
    .where(eq(activities.id, id))
    .returning();

  return c.json({ message: 'Activity updated', activity: updated });
});

// DELETE /api/v1/activities/:id - Delete activity
activitiesRouter.delete('/:id', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [existing] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  if (existing.athleteId !== currentUser.athleteId) {
    return c.json({ error: 'Unauthorized to delete this activity' }, 403);
  }

  await db.delete(activities).where(eq(activities.id, id));

  return c.json({ message: 'Activity deleted successfully' });
});

// POST /api/v1/activities/:id/kudos - Toggle kudos
activitiesRouter.post('/:id/kudos', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  const [existingKudos] = await db
    .select()
    .from(kudos)
    .where(and(eq(kudos.activityId, id), eq(kudos.athleteId, currentUser.athleteId)))
    .limit(1);

  let hasKudos = false;
  if (existingKudos) {
    // Un-kudos
    await db.delete(kudos).where(eq(kudos.id, existingKudos.id));
    hasKudos = false;
  } else {
    // Add kudos
    await db.insert(kudos).values({
      id: `kud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      activityId: id,
      athleteId: currentUser.athleteId,
    });
    hasKudos = true;

    // Send in-app notification if not self-kudos
    if (activity.athleteId !== currentUser.athleteId) {
      await db.insert(notifications).values({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: activity.athleteId,
        actorId: currentUser.athleteId,
        actionType: 'KUDOS',
        targetActivityId: id,
        message: `${currentUser.username} gave you kudos on "${activity.title}"!`,
      });
    }
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(kudos)
    .where(eq(kudos.activityId, id));

  return c.json({
    hasKudos,
    kudosCount: Number(countRow?.count || 0),
  });
});

// GET /api/v1/activities/:id/kudos - List athletes who gave kudos
activitiesRouter.get('/:id/kudos', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');

  const list = await db
    .select({
      id: kudos.id,
      createdAt: kudos.createdAt,
      athlete: {
        id: athletes.id,
        username: athletes.username,
        displayName: athletes.displayName,
        avatarUrl: athletes.avatarUrl,
        city: athletes.city,
      },
    })
    .from(kudos)
    .innerJoin(athletes, eq(kudos.athleteId, athletes.id))
    .where(eq(kudos.activityId, id))
    .orderBy(desc(kudos.createdAt));

  return c.json({ kudos: list, count: list.length });
});

// POST /api/v1/activities/:id/comments - Add a comment or reply
activitiesRouter.post('/:id/comments', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { content, parentCommentId } = body;

  if (!content || !content.trim()) {
    return c.json({ error: 'Comment content cannot be empty' }, 400);
  }

  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newComment] = await db
    .insert(comments)
    .values({
      id: commentId,
      activityId: id,
      athleteId: currentUser.athleteId,
      parentCommentId: parentCommentId || null,
      content: content.trim(),
    })
    .returning();

  // Notify activity author if someone else commented
  if (activity.athleteId !== currentUser.athleteId) {
    await db.insert(notifications).values({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientId: activity.athleteId,
      actorId: currentUser.athleteId,
      actionType: 'COMMENT',
      targetActivityId: id,
      message: `${currentUser.username} commented: "${content.trim().slice(0, 50)}"`,
    });
  }

  return c.json(
    {
      message: 'Comment posted',
      comment: {
        ...newComment,
        author: {
          id: currentUser.athleteId,
          username: currentUser.username,
        },
      },
    },
    201
  );
});

// GET /api/v1/activities/:id/export - Export track as GPX 1.1 XML
activitiesRouter.get('/:id/export', async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');

  const [activity] = await db
    .select()
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);

  if (!activity) {
    return c.json({ error: 'Activity not found' }, 404);
  }

  const points = (activity.rawPolyline || activity.maskedPolyline || []) as LatLngPoint[];

  const trkpts = points
    .map(
      (p) =>
        `      <trkpt lat="${p.latitude}" lon="${p.longitude}">
        ${p.altitude !== undefined && p.altitude !== null ? `<ele>${p.altitude}</ele>` : ''}
        ${p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : ''}
      </trkpt>`
    )
    .join('\n');

  const gpxXml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="OpenStrava" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${activity.title}</name>
    <time>${new Date(activity.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${activity.title}</name>
    <type>${activity.sportType}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;

  return c.body(gpxXml, 200, {
    'Content-Type': 'application/gpx+xml; charset=utf-8',
    'Content-Disposition': `attachment; filename="${activity.title.replace(/[^a-zA-Z0-9]/g, '_')}.gpx"`,
  });
});

