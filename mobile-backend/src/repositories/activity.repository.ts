import { and, desc, eq, lt, sql } from 'drizzle-orm';
import { activities, athletes, comments, kudos } from '../db/schema';
import { CursorPayload } from '../lib/cursor';
import { AppDatabase } from '../lib/db';

export class ActivityRepository {
  constructor(private db: AppDatabase) {}

  async create(data: typeof activities.$inferInsert) {
    const [created] = await this.db.insert(activities).values(data).returning();
    return created;
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

  async listByAthlete(athleteId: string, limit = 20, cursor?: CursorPayload | null) {
    let query = this.db
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
      .where(
        cursor
          ? and(
              eq(activities.athleteId, athleteId),
              lt(activities.startTime, new Date(cursor.timestamp))
            )
          : eq(activities.athleteId, athleteId)
      )
      .orderBy(desc(activities.startTime), desc(activities.id))
      .limit(limit);

    return query;
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

  async toggleKudos(activityId: string, athleteId: string): Promise<{ hasKudos: boolean }> {
    const [existing] = await this.db
      .select()
      .from(kudos)
      .where(and(eq(kudos.activityId, activityId), eq(kudos.athleteId, athleteId)))
      .limit(1);

    if (existing) {
      await this.db.delete(kudos).where(eq(kudos.id, existing.id));
      return { hasKudos: false };
    } else {
      const id = `kud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await this.db.insert(kudos).values({ id, activityId, athleteId });
      return { hasKudos: true };
    }
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
    const id = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
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
