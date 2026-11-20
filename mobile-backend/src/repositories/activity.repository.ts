import { and, desc, eq, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { CursorPayload } from '../lib/cursor';
import { AppDatabase } from '../lib/db';
import { visibleActivitiesWhere } from '../lib/policy';

export class ActivityRepository {
  constructor(private db: AppDatabase) {}

  async create(data: typeof activities.$inferInsert) {
    const [created] = await this.db.insert(activities).values(data).returning();
    return created;
  }

  async findByClientId(athleteId: string, clientActivityId: string) {
    const [row] = await this.db
      .select()
      .from(activities)
      .where(and(eq(activities.athleteId, athleteId), eq(activities.clientActivityId, clientActivityId)))
      .limit(1);
    return row ?? null;
  }

  /** Insert guarded by the unique (athlete_id, client_activity_id) index; returns the existing row on conflict. */
  async createIdempotent(data: typeof activities.$inferInsert) {
    const [created] = await this.db.insert(activities).values(data).onConflictDoNothing().returning();
    if (created) return { created: true, activity: created };
    const existing = data.clientActivityId ? await this.findByClientId(data.athleteId, data.clientActivityId) : null;
    if (!existing) throw new Error('Activity insert conflicted but no existing row was found');
    return { created: false, activity: existing };
  }

  async findById(id: string) {
    const [row] = await this.db
      .select({
        activity: activities,
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
    return row || null;
  }

  async update(id: string, data: Partial<typeof activities.$inferInsert>) {
    const [updated] = await this.db
      .update(activities)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(activities.id, id))
      .returning();
    return updated || null;
  }

  async delete(id: string) {
    await this.db.delete(activities).where(eq(activities.id, id));
  }

  /**
   * Activity history for one athlete as seen by `viewerId` (policy-filtered), newest first, with
   * a row-value cursor on (start_time, id) so equal start times never skip or repeat rows (API-03).
   */
  async listVisibleByAthlete(athleteId: string, viewerId: string | undefined, limit: number, cursor: CursorPayload | null) {
    const conditions = [eq(activities.athleteId, athleteId), visibleActivitiesWhere(viewerId)];
    if (cursor) {
      conditions.push(sql`(${activities.startTime}, ${activities.id}) < (${new Date(cursor.timestamp).toISOString()}::timestamptz, ${cursor.id})`);
    }
    return this.db
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
        calories: activities.calories,
        maskedPolyline: activities.maskedPolyline,
        kudosCount: sql<number>`(select count(*) from ${kudos} where ${kudos.activityId} = ${activities.id})`,
        commentsCount: sql<number>`(select count(*) from ${comments} where ${comments.activityId} = ${activities.id})`,
      })
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startTime), desc(activities.id))
      .limit(limit + 1);
  }

  async getKudosCount(activityId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(kudos)
      .where(eq(kudos.activityId, activityId));
    return Number(res?.count || 0);
  }

  async hasKudos(activityId: string, athleteId: string): Promise<boolean> {
    const [res] = await this.db
      .select()
      .from(kudos)
      .where(and(eq(kudos.activityId, activityId), eq(kudos.athleteId, athleteId)))
      .limit(1);
    return Boolean(res);
  }

  /** Give-only, idempotent. Returns true when a new kudos row was created. */
  async addKudos(activityId: string, athleteId: string): Promise<boolean> {
    const inserted = await this.db
      .insert(kudos)
      .values({ id: `kud_${crypto.randomUUID()}`, activityId, athleteId })
      .onConflictDoNothing()
      .returning({ id: kudos.id });
    return inserted.length > 0;
  }

  async getKudosAthletes(activityId: string) {
    return this.db
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
      .where(eq(kudos.activityId, activityId))
      .orderBy(desc(kudos.createdAt));
  }

  async getComments(activityId: string) {
    return this.db
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
      .where(eq(comments.activityId, activityId))
      .orderBy(comments.createdAt);
  }

  async addComment(activityId: string, athleteId: string, content: string, parentCommentId?: string) {
    const id = `cmt_${crypto.randomUUID()}`;
    const [created] = await this.db
      .insert(comments)
      .values({
        id,
        activityId,
        athleteId,
        content,
        parentCommentId: parentCommentId || null,
      })
      .returning();
    return created;
  }
}

