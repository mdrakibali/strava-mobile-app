import { and, desc, eq, SQL, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { AppDatabase } from '../lib/db';

export interface FeedQueryOptions {
  /** Visibility/audience predicate from lib/policy (required: no unfiltered feed queries). */
  where: SQL;
  /** Viewer, for has_kudoed. */
  viewerId?: string;
}

export class FeedRepository {
  constructor(private db: AppDatabase) {}

  async getTimeline(options: FeedQueryOptions) {
    const conditions: SQL[] = [eq(activities.excludeFromFeed, false), options.where];

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
        kudosCount: sql<number>`(select count(*) from ${kudos} where ${kudos.activityId} = ${activities.id})`,
        commentsCount: sql<number>`(select count(*) from ${comments} where ${comments.activityId} = ${activities.id})`,
        hasKudos: options.viewerId
          ? sql<boolean>`exists (select 1 from ${kudos} where ${kudos.activityId} = ${activities.id} and ${kudos.athleteId} = ${options.viewerId})`
          : sql<boolean>`false`,
      })
      .from(activities)
      .innerJoin(athletes, eq(activities.athleteId, athletes.id))
      .where(and(...conditions))
      .orderBy(desc(activities.startTime), desc(activities.id));

    return rows;
  }
}
