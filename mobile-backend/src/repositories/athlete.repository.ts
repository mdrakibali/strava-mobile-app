import { and, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { activities, athletes, follows } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class AthleteRepository {
  constructor(private db: AppDatabase) {}

  async findById(id: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.id, id))
      .limit(1);
    return athlete || null;
  }

  async findByGoogleId(googleId: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.googleId, googleId))
      .limit(1);
    return athlete || null;
  }

  async findByEmail(email: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.email, email.toLowerCase().trim()))
      .limit(1);
    return athlete || null;
  }

  async findByUsername(username: string) {
    const [athlete] = await this.db
      .select()
      .from(athletes)
      .where(eq(athletes.username, username.toLowerCase().trim()))
      .limit(1);
    return athlete || null;
  }

  async create(data: typeof athletes.$inferInsert) {
    const [created] = await this.db.insert(athletes).values(data).returning();
    return created;
  }

  async update(id: string, data: Partial<typeof athletes.$inferInsert>) {
    const [updated] = await this.db
      .update(athletes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(athletes.id, id))
      .returning();
    return updated || null;
  }

  async search(query: string, limit = 20) {
    if (!query.trim()) {
      return this.db.select().from(athletes).limit(limit);
    }
    const term = `%${query.trim()}%`;
    return this.db
      .select()
      .from(athletes)
      .where(
        or(
          ilike(athletes.displayName, term),
          ilike(athletes.username, term),
          ilike(athletes.city, term)
        )
      )
      .limit(limit);
  }

  async getFollowersCount(athleteId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, athleteId));
    return Number(res?.count || 0);
  }

  async getFollowingCount(athleteId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, athleteId));
    return Number(res?.count || 0);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const [res] = await this.db
      .select()
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    return Boolean(res);
  }

  async follow(followerId: string, followingId: string): Promise<void> {
    await this.db
      .insert(follows)
      .values({ followerId, followingId })
      .onConflictDoNothing();
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async getFollowedIds(athleteId: string): Promise<string[]> {
    const rows = await this.db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, athleteId));
    return rows.map((r) => r.followingId);
  }

  async getRecentActivities(athleteId: string, limit = 10) {
    return this.db
      .select()
      .from(activities)
      .where(eq(activities.athleteId, athleteId))
      .orderBy(desc(activities.startTime))
      .limit(limit);
  }
}

