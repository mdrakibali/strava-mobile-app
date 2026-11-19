import { and, desc, eq, sql } from 'drizzle-orm';
import { gear } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class GearRepository {
  constructor(private db: AppDatabase) {}

  async listByAthlete(athleteId: string) {
    return this.db
      .select()
      .from(gear)
      .where(eq(gear.athleteId, athleteId))
      .orderBy(desc(gear.createdAt));
  }

  async findById(id: string, athleteId: string) {
    const [item] = await this.db
      .select()
      .from(gear)
      .where(and(eq(gear.id, id), eq(gear.athleteId, athleteId)))
      .limit(1);
    return item || null;
  }

  async create(data: typeof gear.$inferInsert) {
    const [created] = await this.db.insert(gear).values(data).returning();
    return created;
  }

  async update(id: string, athleteId: string, data: Partial<typeof gear.$inferInsert>) {
    const [updated] = await this.db
      .update(gear)
      .set(data)
      .where(and(eq(gear.id, id), eq(gear.athleteId, athleteId)))
      .returning();
    return updated || null;
  }

  async delete(id: string, athleteId: string) {
    await this.db.delete(gear).where(and(eq(gear.id, id), eq(gear.athleteId, athleteId)));
  }

  async clearDefault(athleteId: string, sportType: string) {
    await this.db
      .update(gear)
      .set({ isDefault: false })
      .where(and(eq(gear.athleteId, athleteId), eq(gear.sportType, sportType)));
  }

  async incrementDistance(id: string, athleteId: string, meters: number) {
    await this.db
      .update(gear)
      .set({ distanceMeters: sql`${gear.distanceMeters} + ${meters}` })
      .where(and(eq(gear.id, id), eq(gear.athleteId, athleteId)));
  }
}

