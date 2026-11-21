import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { activities, athletes, challengeParticipants, challenges } from '../db/schema';
import { AppDatabase } from '../lib/db';

/**
 * Recompute every challenge this athlete has joined from their real activities in the
 * challenge window. Sport must match. Private activities still count for the owner.
 */
export async function syncChallengeProgress(db: AppDatabase, athleteId: string) {
  const joined = await db
    .select({
      challengeId: challengeParticipants.challengeId,
      sportType: challenges.sportType,
      targetMeters: challenges.targetMeters,
      startDate: challenges.startDate,
      endDate: challenges.endDate,
      completedAt: challengeParticipants.completedAt,
    })
    .from(challengeParticipants)
    .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
    .where(eq(challengeParticipants.athleteId, athleteId));

  for (const ch of joined) {
    const [sum] = await db
      .select({ meters: sql<number>`coalesce(sum(${activities.distanceMeters}), 0)` })
      .from(activities)
      .where(
        and(
          eq(activities.athleteId, athleteId),
          sql`lower(${activities.sportType}) = lower(${ch.sportType})`,
          gte(activities.startTime, ch.startDate),
          lte(activities.startTime, ch.endDate)
        )
      );
    const meters = Number(sum?.meters ?? 0);
    const target = Number(ch.targetMeters);
    const done = target > 0 && meters >= target;
    await db
      .update(challengeParticipants)
      .set({
        currentMeters: meters.toFixed(2),
        isCompleted: done,
        completedAt: done ? ch.completedAt ?? new Date() : null,
      })
      .where(and(eq(challengeParticipants.challengeId, ch.challengeId), eq(challengeParticipants.athleteId, athleteId)));
  }
}

export class ChallengeRepository {
  constructor(private db: AppDatabase) {}

  async list() {
    const rows = await this.db
      .select({
        id: challenges.id,
        title: challenges.title,
        description: challenges.description,
        sportType: challenges.sportType,
        targetMeters: challenges.targetMeters,
        badgeUrl: challenges.badgeUrl,
        startDate: challenges.startDate,
        endDate: challenges.endDate,
        creatorId: challenges.creatorId,
        createdAt: challenges.createdAt,
        participantsCount: sql<number>`count(${challengeParticipants.athleteId})`,
      })
      .from(challenges)
      .leftJoin(challengeParticipants, eq(challenges.id, challengeParticipants.challengeId))
      .groupBy(challenges.id)
      .orderBy(desc(challenges.startDate));

    return rows.map((r) => ({
      ...r,
      participantsCount: Number(r.participantsCount || 0),
    }));
  }

  async findById(id: string) {
    const [ch] = await this.db.select().from(challenges).where(eq(challenges.id, id)).limit(1);
    return ch || null;
  }

  async create(data: typeof challenges.$inferInsert) {
    const [created] = await this.db.insert(challenges).values(data).returning();
    return created;
  }

  async update(id: string, values: Partial<typeof challenges.$inferInsert>) {
    const [updated] = await this.db.update(challenges).set(values).where(eq(challenges.id, id)).returning();
    return updated;
  }

  async delete(id: string) {
    await this.db.delete(challenges).where(eq(challenges.id, id));
  }

  async resyncParticipants(challengeId: string) {
    const rows = await this.db
      .select({ athleteId: challengeParticipants.athleteId })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));
    for (const r of rows) await syncChallengeProgress(this.db, r.athleteId);
  }

  async getParticipantCount(challengeId: string): Promise<number> {
    const [res] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(challengeParticipants)
      .where(eq(challengeParticipants.challengeId, challengeId));
    return Number(res?.count || 0);
  }

  async getParticipation(challengeId: string, athleteId: string) {
    const [participation] = await this.db
      .select()
      .from(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.athleteId, athleteId)
        )
      )
      .limit(1);
    return participation || null;
  }

  async getUserParticipations(athleteId: string) {
    return this.db
      .select()
      .from(challengeParticipants)
      .where(eq(challengeParticipants.athleteId, athleteId));
  }

  async join(challengeId: string, athleteId: string) {
    await this.db
      .insert(challengeParticipants)
      .values({
        challengeId,
        athleteId,
        currentMeters: '0',
        isCompleted: false,
      })
      .onConflictDoNothing();
    await syncChallengeProgress(this.db, athleteId);
  }

  async leave(challengeId: string, athleteId: string) {
    await this.db
      .delete(challengeParticipants)
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.athleteId, athleteId)
        )
      );
  }

  async getLeaderboard(challengeId: string, limit = 50) {
    return this.db
      .select({
        athleteId: challengeParticipants.athleteId,
        currentMeters: sql<number>`CAST(${challengeParticipants.currentMeters} AS DOUBLE PRECISION)`,
        isCompleted: challengeParticipants.isCompleted,
        completedAt: challengeParticipants.completedAt,
        joinedAt: challengeParticipants.joinedAt,
        displayName: athletes.displayName,
        username: athletes.username,
        avatarUrl: athletes.avatarUrl,
        city: athletes.city,
      })
      .from(challengeParticipants)
      .innerJoin(athletes, eq(challengeParticipants.athleteId, athletes.id))
      .where(eq(challengeParticipants.challengeId, challengeId))
      .orderBy(desc(challengeParticipants.currentMeters))
      .limit(limit);
  }

  async getActiveParticipationsForAthlete(athleteId: string) {
    return this.db
      .select({
        challengeId: challengeParticipants.challengeId,
        currentMeters: sql<number>`CAST(${challengeParticipants.currentMeters} AS DOUBLE PRECISION)`,
        targetMeters: sql<number>`CAST(${challenges.targetMeters} AS DOUBLE PRECISION)`,
        challengeTitle: challenges.title,
        sportType: challenges.sportType,
      })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(
        and(
          eq(challengeParticipants.athleteId, athleteId),
          eq(challengeParticipants.isCompleted, false)
        )
      );
  }

  async updateProgress(challengeId: string, athleteId: string, currentMeters: number, isCompleted: boolean) {
    await this.db
      .update(challengeParticipants)
      .set({
        currentMeters: String(currentMeters),
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      })
      .where(
        and(
          eq(challengeParticipants.challengeId, challengeId),
          eq(challengeParticipants.athleteId, athleteId)
        )
      );
  }
}
