import { and, desc, eq } from 'drizzle-orm';
import { athletes, beaconSessions } from '../db/schema';
import { AppDatabase } from '../lib/db';

export class BeaconRepository {
  constructor(private db: AppDatabase) {}

  async findByToken(token: string) {
    const [session] = await this.db
      .select({
        session: beaconSessions,
        athlete: {
          id: athletes.id,
          displayName: athletes.displayName,
          username: athletes.username,
          avatarUrl: athletes.avatarUrl,
        },
      })
      .from(beaconSessions)
      .innerJoin(athletes, eq(beaconSessions.athleteId, athletes.id))
      .where(eq(beaconSessions.token, token))
      .limit(1);
    return session || null;
  }

  async create(data: typeof beaconSessions.$inferInsert) {
    const [session] = await this.db.insert(beaconSessions).values(data).returning();
    return session;
  }

  async updatePing(
    token: string,
    coords: {
      latitude: number;
      longitude: number;
      altitude?: number | null;
      speedMps?: number | null;
      batteryPercentage?: number;
    }
  ) {
    const [updated] = await this.db
      .update(beaconSessions)
      .set({
        lastLatitude: String(coords.latitude),
        lastLongitude: String(coords.longitude),
        lastAltitude: coords.altitude !== undefined && coords.altitude !== null ? String(coords.altitude) : null,
        lastSpeedMps: coords.speedMps !== undefined && coords.speedMps !== null ? String(coords.speedMps) : null,
        batteryPercentage: coords.batteryPercentage,
        lastPingAt: new Date(),
      })
      .where(and(eq(beaconSessions.token, token), eq(beaconSessions.isActive, true)))
      .returning();
    return updated || null;
  }

  async stop(token: string, athleteId: string) {
    await this.db
      .update(beaconSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(and(eq(beaconSessions.token, token), eq(beaconSessions.athleteId, athleteId)));
  }
}
