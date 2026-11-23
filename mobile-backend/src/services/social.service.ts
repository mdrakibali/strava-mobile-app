import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { activities, athletes, follows } from '../db/schema';
import { AppDatabase } from '../lib/db';
import { HttpError, notFound } from '../lib/http';
import { visibleActivitiesWhere } from '../lib/policy';
import { NotificationRepository } from '../repositories/notification.repository';

const athleteCard = {
  id: athletes.id,
  username: athletes.username,
  displayName: athletes.displayName,
  avatarUrl: athletes.avatarUrl,
  city: athletes.city,
  country: athletes.country,
};

const WEEK_MS = 7 * 86_400_000;

/** Monday 00:00 UTC of the week containing `t`. */
export const weekStartUtc = (t: number) => {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
};

/**
 * Follow graph and athlete statistics. Follow/unfollow are idempotent (PUT/DELETE), so a retried
 * or double-tapped request can never flip the state the wrong way (API-05).
 */
export class SocialService {
  constructor(private db: AppDatabase) {}

  private async requireAthlete(id: string) {
    const [a] = await this.db.select({ id: athletes.id }).from(athletes).where(eq(athletes.id, id)).limit(1);
    if (!a) throw notFound('Athlete');
  }

  private async counts(id: string) {
    const [r] = await this.db
      .select({
        followers: sql<number>`(select count(*) from ${follows} where ${follows.followingId} = ${id})`,
        following: sql<number>`(select count(*) from ${follows} where ${follows.followerId} = ${id})`,
      })
      .from(athletes)
      .where(eq(athletes.id, id));
    return { followersCount: Number(r?.followers ?? 0), followingCount: Number(r?.following ?? 0) };
  }

  async follow(viewerId: string, viewerUsername: string, targetId: string) {
    if (viewerId === targetId) throw new HttpError(422, 'self_follow', 'You can’t follow yourself');
    await this.requireAthlete(targetId);
    const inserted = await this.db
      .insert(follows)
      .values({ followerId: viewerId, followingId: targetId })
      .onConflictDoNothing()
      .returning({ id: follows.followerId });
    if (inserted.length > 0) {
      // Notify only on a new follow (no duplicates on retries).
      await new NotificationRepository(this.db).create({
        id: `notif_${crypto.randomUUID()}`,
        recipientId: targetId,
        actorId: viewerId,
        actionType: 'FOLLOW',
        message: `${viewerUsername || 'An athlete'} started following you`,
      });
    }
    return { isFollowing: true, ...(await this.relationshipCounts(viewerId, targetId)) };
  }

  async unfollow(viewerId: string, targetId: string) {
    await this.requireAthlete(targetId);
    await this.db.delete(follows).where(and(eq(follows.followerId, viewerId), eq(follows.followingId, targetId)));
    return { isFollowing: false, ...(await this.relationshipCounts(viewerId, targetId)) };
  }

  /**
   * followersCount is the person who was followed. followingCount is the viewer, so the
   * signed-in athlete's "following" number stays correct on every screen.
   */
  private async relationshipCounts(viewerId: string, targetId: string) {
    const [target, viewer] = await Promise.all([this.counts(targetId), this.counts(viewerId)]);
    return { followersCount: target.followersCount, followingCount: viewer.followingCount };
  }

  /**
   * Followers or following of `athleteId`, newest relationship first, each with whether the
   * viewer follows that person (for inline Follow buttons).
   */
  async list(kind: 'followers' | 'following', athleteId: string, viewerId: string | undefined) {
    await this.requireAthlete(athleteId);
    const joinOn = kind === 'followers' ? follows.followerId : follows.followingId;
    const whereCol = kind === 'followers' ? follows.followingId : follows.followerId;
    const conds = [eq(whereCol, athleteId)];
    const rows = await this.db
      .select({
        ...athleteCard,
        since: follows.createdAt,
        isFollowing: viewerId
          ? sql<boolean>`exists (select 1 from ${follows} f2 where f2.follower_id = ${viewerId} and f2.following_id = ${athletes.id})`
          : sql<boolean>`false`,
      })
      .from(follows)
      .innerJoin(athletes, eq(athletes.id, joinOn))
      .where(and(...conds))
      .orderBy(desc(follows.createdAt), desc(joinOn));

    return {
      athletes: rows.map((r) => ({ ...r, isFollowing: Boolean(r.isFollowing), isSelf: r.id === viewerId })),
      count: rows.length,
    };
  }

  /**
   * Profile statistics computed from the activities the VIEWER may see (policy-aware), so private
   * activities never leak through totals. Weeks are Monday-based in UTC.
   */
  async stats(athleteId: string, viewerId: string | undefined, now = Date.now()) {
    await this.requireAthlete(athleteId);
    const thisWeek = weekStartUtc(now);
    const from12 = thisWeek - 11 * WEEK_MS;
    const yearStart = Date.UTC(new Date(now).getUTCFullYear(), 0, 1);
    const base = and(eq(activities.athleteId, athleteId), visibleActivitiesWhere(viewerId));

    const totals = await this.db
      .select({
        sportType: activities.sportType,
        count: sql<number>`count(*)`,
        distance: sql<number>`coalesce(sum(${activities.distanceMeters}), 0)`,
        moving: sql<number>`coalesce(sum(${activities.movingTimeSeconds}), 0)`,
        elevation: sql<number>`coalesce(sum(${activities.elevationGainMeters}), 0)`,
        ytdCount: sql<number>`count(*) filter (where ${activities.startTime} >= ${new Date(yearStart).toISOString()}::timestamptz)`,
        ytdDistance: sql<number>`coalesce(sum(${activities.distanceMeters}) filter (where ${activities.startTime} >= ${new Date(yearStart).toISOString()}::timestamptz), 0)`,
        ytdMoving: sql<number>`coalesce(sum(${activities.movingTimeSeconds}) filter (where ${activities.startTime} >= ${new Date(yearStart).toISOString()}::timestamptz), 0)`,
        ytdElevation: sql<number>`coalesce(sum(${activities.elevationGainMeters}) filter (where ${activities.startTime} >= ${new Date(yearStart).toISOString()}::timestamptz), 0)`,
      })
      .from(activities)
      .where(base)
      .groupBy(activities.sportType);

    const recent = await this.db
      .select({
        sportType: activities.sportType,
        startTime: activities.startTime,
        distance: activities.distanceMeters,
        moving: activities.movingTimeSeconds,
        elevation: activities.elevationGainMeters,
      })
      .from(activities)
      .where(and(base, gte(activities.startTime, new Date(from12))));

    const weeks = Array.from({ length: 12 }, (_, i) => ({ weekStart: new Date(from12 + i * WEEK_MS).toISOString(), bySport: {} as Record<string, { distance: number; moving: number; elevation: number; count: number }> }));
    for (const r of recent) {
      const idx = Math.floor((weekStartUtc(r.startTime.getTime()) - from12) / WEEK_MS);
      if (idx < 0 || idx > 11) continue;
      const w = (weeks[idx].bySport[r.sportType] ??= { distance: 0, moving: 0, elevation: 0, count: 0 });
      w.distance += Number(r.distance);
      w.moving += r.moving;
      w.elevation += r.elevation;
      w.count += 1;
    }

    return {
      activityCount: totals.reduce((a, t) => a + Number(t.count), 0),
      ...(await this.counts(athleteId)),
      bySport: totals.map((t) => ({
        sportType: t.sportType,
        allTime: { count: Number(t.count), distanceMeters: Number(t.distance), movingTimeSeconds: Number(t.moving), elevationGainMeters: Number(t.elevation) },
        yearToDate: { count: Number(t.ytdCount), distanceMeters: Number(t.ytdDistance), movingTimeSeconds: Number(t.ytdMoving), elevationGainMeters: Number(t.ytdElevation) },
      })),
      weeks,
    };
  }
}
