import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { activities, athletes } from '../db/schema';
import { CursorPayload } from '../lib/cursor';
import { AppDatabase } from '../lib/db';

export interface FeedQueryOptions {
  athleteIds?: string[] | null;
  publicOnly?: boolean;
  limit?: number;
  cursor?: CursorPayload | null;
}

export class FeedRepository {
  constructor(private db: AppDatabase) {}

  async getTimeline(options: FeedQueryOptions) {
    const limit = Math.min(50, Math.max(1, options.limit || 15));
    const cursor = options.cursor;

    let baseQuery = this.db
      .select({
        activity: activities,
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
      .orderBy(desc(activities.startTime), desc(activities.id))
      .limit(limit + 1); // Fetch 1 extra to determine hasNextPage

    const conditions = [eq(activities.excludeFromFeed, false)];

    if (cursor) {
      conditions.push(lt(activities.startTime, new Date(cursor.timestamp)));
    }

    if (options.athleteIds && options.athleteIds.length > 0) {
      conditions.push(inArray(activities.athleteId, options.athleteIds));
    } else if (options.publicOnly) {
      conditions.push(eq(activities.visibility, 'PUBLIC'));
    }

    baseQuery = baseQuery.where(and(...conditions)) as any;

    const rows = await baseQuery;
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
