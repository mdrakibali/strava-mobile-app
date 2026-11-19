import { Hono } from 'hono';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { activities, athletes, clubMembers, comments, follows, kudos } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth } from '../middleware/auth';
import { Env } from '../types';

export const feedRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/feed - Social timeline feed
feedRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const tab = c.req.query('tab') || 'all'; // 'following' | 'all' | 'clubs'
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit')) || 15));
  const offset = Math.max(0, Number(c.req.query('offset')) || 0);

  let targetAthleteIds: string[] | null = null;

  if (tab === 'following' && currentUser) {
    // Activities from people the current user follows + the current user
    const userFollows = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, currentUser.athleteId));
    
    targetAthleteIds = [currentUser.athleteId, ...userFollows.map((f) => f.followingId)];
  } else if (tab === 'clubs' && currentUser) {
    // Activities from club mates
    const userClubs = await db
      .select({ clubId: clubMembers.clubId })
      .from(clubMembers)
      .where(eq(clubMembers.athleteId, currentUser.athleteId));

    if (userClubs.length > 0) {
      const clubIds = userClubs.map((uc) => uc.clubId);
      const mates = await db
        .select({ athleteId: clubMembers.athleteId })
        .from(clubMembers)
        .where(inArray(clubMembers.clubId, clubIds));
      targetAthleteIds = Array.from(new Set(mates.map((m) => m.athleteId)));
    } else {
      targetAthleteIds = [currentUser.athleteId];
    }
  }

  // Base query with athlete join
  let baseQuery = db
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
      calories: activities.calories,
      relativeEffortScore: activities.relativeEffortScore,
      gapFormatted: activities.gapFormatted,
      rawPolyline: activities.rawPolyline,
      maskedPolyline: activities.maskedPolyline,
      splits: activities.splits,
      elevationProfile: activities.elevationProfile,
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
    .where(eq(activities.excludeFromFeed, false))
    .orderBy(desc(activities.startTime))
    .limit(limit)
    .offset(offset);

  if (targetAthleteIds && targetAthleteIds.length > 0) {
    baseQuery = baseQuery.where(
      and(
        inArray(activities.athleteId, targetAthleteIds),
        eq(activities.excludeFromFeed, false)
      )
    ) as any;
  } else if (!currentUser) {
    baseQuery = baseQuery.where(
      and(
        eq(activities.visibility, 'PUBLIC'),
        eq(activities.excludeFromFeed, false)
      )
    ) as any;
  }

  const items = await baseQuery;

  // Enrich with kudos count, current user's kudos, and comments count
  const feedItems = await Promise.all(
    items.map(async (act) => {
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

      const isAuthor = currentUser && currentUser.athleteId === act.athleteId;

      return {
        ...act,
        // Only author sees raw polyline with exact home coords, others see masked
        polyline: isAuthor ? (act.rawPolyline || act.maskedPolyline) : act.maskedPolyline,
        rawPolyline: isAuthor ? act.rawPolyline : undefined,
        kudosCount: Number(kudosCountRow?.count || 0),
        commentsCount: Number(commentsCountRow?.count || 0),
        hasKudos,
      };
    })
  );

  return c.json({
    feed: feedItems,
    count: feedItems.length,
    tab,
    hasMore: feedItems.length === limit,
  });
});

