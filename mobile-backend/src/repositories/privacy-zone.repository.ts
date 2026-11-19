import { and, desc, eq, sql } from 'drizzle-orm';
import { privacyZones } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class PrivacyZoneRepository {
  constructor(private db: AppDatabase) {}

  async findByAthlete(athleteId: string) {
    return this.db
      .select()
      .from(privacyZones)
      .where(eq(privacyZones.athleteId, athleteId))
      .orderBy(desc(privacyZones.createdAt));
  }

  async findActiveByAthlete(athleteId: string) {
    return this.db
      .select({
        latitude: sql<number>`CAST(${privacyZones.latitude} AS DOUBLE PRECISION)`,
        longitude: sql<number>`CAST(${privacyZones.longitude} AS DOUBLE PRECISION)`,
        radiusMeters: privacyZones.radiusMeters,
        isActive: privacyZones.isActive,
      })
      .from(privacyZones)
      .where(and(eq(privacyZones.athleteId, athleteId), eq(privacyZones.isActive, true)));
  }

  async findById(id: string, athleteId: string) {
    const [zone] = await this.db
      .select()
      .from(privacyZones)
      .where(and(eq(privacyZones.id, id), eq(privacyZones.athleteId, athleteId)))
      .limit(1);
    return zone || null;
  }

  async create(data: typeof privacyZones.$inferInsert) {
    const [zone] = await this.db.insert(privacyZones).values(data).returning();
    return zone;
  }

  async update(id: string, athleteId: string, data: Partial<typeof privacyZones.$inferInsert>) {
    const [updated] = await this.db
      .update(privacyZones)
      .set(data)
      .where(and(eq(privacyZones.id, id), eq(privacyZones.athleteId, athleteId)))
      .returning();
    return updated || null;
  }

  async delete(id: string, athleteId: string) {
    await this.db
      .delete(privacyZones)
      .where(and(eq(privacyZones.id, id), eq(privacyZones.athleteId, athleteId)));
  }
}

