import { and, desc, eq, SQL, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { CursorPayload } from '../lib/cursor';
import { AppDatabase } from '../lib/db';

export interface FeedQueryOptions {
  /** Visibility/audience predicate from lib/policy (required: no unfiltered feed queries). */
  where: SQL;
  /** Viewer, for has_kudoed. */
  viewerId?: string;
  limit?: number;
  cursor?: CursorPayload | null;
}

export class FeedRepository {
  constructor(private db: AppDatabase) {}

  async getTimeline(options: FeedQueryOptions) {
    const limit = Math.min(500, Math.max(1, options.limit || 500));
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
        // Correlated subqueries instead of join + group by (no row multiplication; API-04).
        kudosCount: sql<number>`(select count(*) from ${kudos} where ${kudos.activityId} = ${activities.id})`,
        commentsCount: sql<number>`(select count(*) from ${comments} where ${comments.activityId} = ${activities.id})`,
        hasKudos: options.viewerId
          ? sql<boolean>`exists (select 1 from ${kudos} where ${kudos.activityId} = ${activities.id} and ${kudos.athleteId} = ${options.viewerId})`
          : sql<boolean>`false`,
      })
      .from(activities)
      .innerJoin(athletes, eq(activities.athleteId, athletes.id))
      .where(and(...conditions))
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
