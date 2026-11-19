import { Hono } from 'hono';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { activities, athletes, clubMembers, clubs } from '../db/schema';
import { getDb } from '../lib/db';
import { optionalAuth, requireAuth } from '../middleware/auth';
import { Env } from '../types';

export const clubsRouter = new Hono<{ Bindings: Env }>();

// GET /api/v1/clubs - List / search clubs
clubsRouter.get('/', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const q = c.req.query('q');
  const myOnly = c.req.query('filter') === 'my';

  let clubIdsFilter: string[] | null = null;
  if (myOnly && currentUser) {
    const joined = await db
      .select({ clubId: clubMembers.clubId })
      .from(clubMembers)
      .where(eq(clubMembers.athleteId, currentUser.athleteId));
    clubIdsFilter = joined.map((j) => j.clubId);
  }

  let baseQuery = db.select().from(clubs);

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    baseQuery = baseQuery.where(
      or(ilike(clubs.name, term), ilike(clubs.city, term), ilike(clubs.sportType, term))
    ) as any;
  }

  if (clubIdsFilter) {
    if (clubIdsFilter.length === 0) {
      return c.json({ clubs: [], count: 0 });
    }
    baseQuery = baseQuery.where(inArray(clubs.id, clubIdsFilter)) as any;
  }

  const list = await baseQuery.limit(30);

  // Enrich with member count and membership status
  const enriched = await Promise.all(
    list.map(async (club) => {
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(clubMembers)
        .where(eq(clubMembers.clubId, club.id));

      let isMember = false;
      let userRole = null;
      if (currentUser) {
        const [membership] = await db
          .select({ role: clubMembers.role })
          .from(clubMembers)
          .where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.athleteId, currentUser.athleteId)))
          .limit(1);
        if (membership) {
          isMember = true;
          userRole = membership.role;
        }
      }

      return {
        ...club,
        membersCount: Number(countRow?.count || 0),
        isMember,
        userRole,
      };
    })
  );

  return c.json({ clubs: enriched, count: enriched.length });
});

// GET /api/v1/clubs/:id - Club details + weekly mileage leaderboard
clubsRouter.get('/:id', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);

  if (!club) {
    return c.json({ error: 'Club not found' }, 404);
  }

  // Member count
  const [memberCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, id));

  // Current user membership
  let isMember = false;
  let userRole = null;
  if (currentUser) {
    const [membership] = await db
      .select({ role: clubMembers.role })
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.athleteId, currentUser.athleteId)))
      .limit(1);
    if (membership) {
      isMember = true;
      userRole = membership.role;
    }
  }

  // Weekly Leaderboard: aggregated distance & time for members since Monday of current week
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(now.setDate(now.getDate() + diffToMonday));
  monday.setHours(0, 0, 0, 0);

  // Fetch all members of this club
  const members = await db
    .select({
      athleteId: clubMembers.athleteId,
      role: clubMembers.role,
      displayName: athletes.displayName,
      username: athletes.username,
      avatarUrl: athletes.avatarUrl,
    })
    .from(clubMembers)
    .innerJoin(athletes, eq(clubMembers.athleteId, athletes.id))
    .where(eq(clubMembers.clubId, id));

  const memberIds = members.map((m) => m.athleteId);

  let leaderboard: any[] = [];
  if (memberIds.length > 0) {
    const memberStats = await db
      .select({
        athleteId: activities.athleteId,
        totalDistanceMeters: sql<number>`COALESCE(SUM(CAST(${activities.distanceMeters} AS DOUBLE PRECISION)), 0)`,
        totalMovingSeconds: sql<number>`COALESCE(SUM(${activities.movingTimeSeconds}), 0)`,
        activitiesCount: sql<number>`COUNT(*)`,
      })
      .from(activities)
      .where(
        and(
          inArray(activities.athleteId, memberIds),
          sql`${activities.startTime} >= ${monday.toISOString()}`
        )
      )
      .groupBy(activities.athleteId);

    const statsMap = new Map(memberStats.map((s) => [s.athleteId, s]));

    leaderboard = members
      .map((m) => {
        const stat = statsMap.get(m.athleteId);
        return {
          athleteId: m.athleteId,
          displayName: m.displayName,
          username: m.username,
          avatarUrl: m.avatarUrl,
          role: m.role,
          distanceMeters: stat ? Number(stat.totalDistanceMeters) : 0,
          movingTimeSeconds: stat ? Number(stat.totalMovingSeconds) : 0,
          activitiesCount: stat ? Number(stat.activitiesCount) : 0,
        };
      })
      .sort((a, b) => b.distanceMeters - a.distanceMeters);
  }

  return c.json({
    club: {
      ...club,
      membersCount: Number(memberCountRow?.count || 0),
      isMember,
      userRole,
    },
    weeklyLeaderboard: leaderboard,
  });
});

// POST /api/v1/clubs - Create new club
clubsRouter.post('/', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const currentUser = c.get('user');
  const body = await c.req.json();
  const { name, sportType = 'Run', city, country, description, isPrivate = false, avatarUrl, bannerUrl } = body;

  if (!name || !name.trim()) {
    return c.json({ error: 'Club name is required' }, 400);
  }

  const clubId = `clb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const [newClub] = await db
    .insert(clubs)
    .values({
      id: clubId,
      name: name.trim(),
      sportType,
      city: city || 'Dhaka',
      country: country || 'Bangladesh',
      description: description || null,
      isPrivate: Boolean(isPrivate),
      avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      bannerUrl: bannerUrl || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200',
      creatorId: currentUser.athleteId,
    })
    .returning();

  // Add creator as OWNER
  await db.insert(clubMembers).values({
    clubId,
    athleteId: currentUser.athleteId,
    role: 'OWNER',
  });

  return c.json(
    {
      message: 'Club created successfully',
      club: newClub,
    },
    201
  );
});

// POST /api/v1/clubs/:id/join - Join or leave club
clubsRouter.post('/:id/join', requireAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');
  const currentUser = c.get('user');

  const [club] = await db.select().from(clubs).where(eq(clubs.id, id)).limit(1);

  if (!club) {
    return c.json({ error: 'Club not found' }, 404);
  }

  const [existing] = await db
    .select()
    .from(clubMembers)
    .where(and(eq(clubMembers.clubId, id), eq(clubMembers.athleteId, currentUser.athleteId)))
    .limit(1);

  let isMember = false;
  if (existing) {
    // Leave club (unless user is owner)
    if (existing.role === 'OWNER') {
      return c.json({ error: 'Club owner cannot leave. Transfer ownership or delete club.' }, 400);
    }
    await db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, id), eq(clubMembers.athleteId, currentUser.athleteId)));
    isMember = false;
  } else {
    // Join club
    await db.insert(clubMembers).values({
      clubId: id,
      athleteId: currentUser.athleteId,
      role: 'MEMBER',
    });
    isMember = true;
  }

  const [memberCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clubMembers)
    .where(eq(clubMembers.clubId, id));

  return c.json({
    message: isMember ? 'Joined club successfully' : 'Left club successfully',
    isMember,
    membersCount: Number(memberCountRow?.count || 0),
  });
});

// GET /api/v1/clubs/:id/members - List club members
clubsRouter.get('/:id/members', optionalAuth, async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = c.req.param('id');

  const members = await db
    .select({
      athleteId: clubMembers.athleteId,
      role: clubMembers.role,
      joinedAt: clubMembers.joinedAt,
      displayName: athletes.displayName,
      username: athletes.username,
      avatarUrl: athletes.avatarUrl,
      city: athletes.city,
    })
    .from(clubMembers)
    .innerJoin(athletes, eq(clubMembers.athleteId, athletes.id))
    .where(eq(clubMembers.clubId, id))
    .orderBy(desc(clubMembers.joinedAt));

  return c.json({ members, count: members.length });
});

