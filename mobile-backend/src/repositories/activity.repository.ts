import { and, desc, eq, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { countOf } from '../lib/counts';
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
   * Activity history for one athlete as seen by `viewerId` (policy-filtered), newest first.
   */
  async listVisibleByAthlete(athleteId: string, viewerId: string | undefined) {
    const conditions = [eq(activities.athleteId, athleteId), visibleActivitiesWhere(viewerId)];
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
        kudosCount: sql<number>`(select count(*) from ${kudos} where ${kudos.activityId} = ${activities.id})`.as('kudosCount'),
        commentsCount: sql<number>`(select count(*) from ${comments} where ${comments.activityId} = ${activities.id})`.as('commentsCount'),
        hasKudos: viewerId
          ? sql<boolean>`exists (select 1 from ${kudos} where ${kudos.activityId} = ${activities.id} and ${kudos.athleteId} = ${viewerId})`.as('hasKudos')
          : sql<boolean>`false`.as('hasKudos'),
      })
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startTime), desc(activities.id));
  }

  async getKudosCount(activityId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(kudos)
      .where(eq(kudos.activityId, activityId));
    return countOf(res?.count);
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

  /** Idempotent. Returns true when a kudos row was actually removed. */
  async removeKudos(activityId: string, athleteId: string): Promise<boolean> {
    const removed = await this.db
      .delete(kudos)
      .where(and(eq(kudos.activityId, activityId), eq(kudos.athleteId, athleteId)))
      .returning({ id: kudos.id });
    return removed.length > 0;
  }

  /** Who gave kudos, newest first. */
  async listKudos(activityId: string) {
    const conds = [eq(kudos.activityId, activityId)];
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
      .where(and(...conds))
      .orderBy(desc(kudos.createdAt), desc(kudos.id));
  }

  async getComment(commentId: string) {
    const [row] = await this.db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    return row ?? null;
  }

  async updateComment(commentId: string, content: string) {
    const [row] = await this.db
      .update(comments)
      .set({ content, updatedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning();
    return row ?? null;
  }

  async deleteComment(commentId: string) {
    await this.db.delete(comments).where(eq(comments.id, commentId));
  }

  async getCommentsCount(activityId: string): Promise<number> {
    const [res] = await this.db.select({ count: sql<number>`count(*)` }).from(comments).where(eq(comments.activityId, activityId));
    return countOf(res?.count);
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

  /** Comments oldest first (conversation order). */
  async getComments(activityId: string) {
    const conds = [eq(comments.activityId, activityId)];
    return this.db
      .select({
        id: comments.id,
        content: comments.content,
        parentCommentId: comments.parentCommentId,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        author: {
          id: athletes.id,
          username: athletes.username,
          displayName: athletes.displayName,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(comments)
      .innerJoin(athletes, eq(comments.athleteId, athletes.id))
      .where(and(...conds))
      .orderBy(comments.createdAt, comments.id);
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

