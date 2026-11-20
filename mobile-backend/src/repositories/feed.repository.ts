import { and, desc, eq, SQL, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { CursorPayload } from '../lib/cursor';
import { AppDatabase } from '../lib/db';

export interface FeedQueryOptions {
  /** Visibility/audience predicate from lib/policy (required: no unfiltered feed queries). */
  where: SQL;
  limit?: number;
  cursor?: CursorPayload | null;
}

export class FeedRepository {
  constructor(private db: AppDatabase) {}

  async getTimeline(options: FeedQueryOptions) {
    const limit = Math.min(50, Math.max(1, options.limit || 15));
    const cursor = options.cursor;

    const conditions: SQL[] = [eq(activities.excludeFromFeed, false), options.where];

    if (cursor) {
      // Row-value comparison: activities sharing a start time are neither skipped nor repeated (API-03).
      conditions.push(
        sql`(${activities.startTime}, ${activities.id}) < (${new Date(cursor.timestamp).toISOString()}::timestamptz, ${cursor.id})`
      );
    }

    const rows = await this.db
      .select({
        activity: activities,
        athlete: {
          id: athletes.id,
          username: athletes.username,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
          city: athletes.city,
        },
        kudosCount: sql<number>`count(distinct ${kudos.id})`,
        commentsCount: sql<number>`count(distinct ${comments.id})`,
      })
      .from(activities)
      .innerJoin(athletes, eq(activities.athleteId, athletes.id))
      .leftJoin(kudos, eq(activities.id, kudos.activityId))
      .leftJoin(comments, eq(activities.id, comments.activityId))
      .where(and(...conditions))
      .groupBy(activities.id, athletes.id)
      .orderBy(desc(activities.startTime), desc(activities.id))
      .limit(limit + 1);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;

    const lastItem = items[items.length - 1];
    const nextCursor =
      hasNextPage && lastItem
        ? {
            timestamp: lastItem.activity.startTime.toISOString(),
            id: lastItem.activity.id,
          }
        : null;

    return {
      items,
      hasNextPage,
      nextCursor,
    };
  }
}
