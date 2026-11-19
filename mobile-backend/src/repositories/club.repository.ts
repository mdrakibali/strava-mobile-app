import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { activities, athletes, clubMembers, clubs } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class ClubRepository {
  constructor(private db: AppDatabase) {}

  async findById(id: string) {
    const [club] = await this.db.select().from(clubs).where(eq(clubs.id, id)).limit(1);
    return club || null;
  }

  async list(query?: string, clubIds?: string[]) {
    let baseQuery = this.db.select().from(clubs);
    const conditions = [];

    if (query && query.trim()) {
      const term = `%${query.trim()}%`;
      conditions.push(or(ilike(clubs.name, term), ilike(clubs.city, term), ilike(clubs.sportType, term)));
    }

    if (clubIds) {
      if (clubIds.length === 0) return [];
      conditions.push(inArray(clubs.id, clubIds));
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    return baseQuery.limit(30);
  }

  async create(data: typeof clubs.$inferInsert) {
    const [club] = await this.db.insert(clubs).values(data).returning();
    return club;
  }

  async getMemberCount(clubId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(clubMembers)
      .where(eq(clubMembers.clubId, clubId));
    return Number(res?.count || 0);
  }

  async getMembership(clubId: string, athleteId: string) {
    const [membership] = await this.db
      .select()
      .from(clubMembers)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.athleteId, athleteId)))
      .limit(1);
    return membership || null;
  }

  async addMember(clubId: string, athleteId: string, role = 'MEMBER') {
    await this.db
      .insert(clubMembers)
      .values({ clubId, athleteId, role })
      .onConflictDoNothing();
  }

  async removeMember(clubId: string, athleteId: string) {
    await this.db
      .delete(clubMembers)
      .where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.athleteId, athleteId)));
  }

  async getMembers(clubId: string) {
    return this.db
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
      .where(eq(clubMembers.clubId, clubId))
      .orderBy(desc(clubMembers.joinedAt));
  }

  async getUserClubIds(athleteId: string): Promise<string[]> {
    const rows = await this.db
      .select({ clubId: clubMembers.clubId })
      .from(clubMembers)
      .where(eq(clubMembers.athleteId, athleteId));
    return rows.map((r) => r.clubId);
  }

  async getWeeklyStats(memberIds: string[], sinceDate: Date) {
    if (memberIds.length === 0) return [];
    return this.db
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
          sql`${activities.startTime} >= ${sinceDate.toISOString()}`
        )
      )
      .groupBy(activities.athleteId);
  }
}
