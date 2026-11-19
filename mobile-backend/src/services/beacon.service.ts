import { BeaconRepository } from '../repositories/beacon.repository';

export class BeaconService {
  constructor(private beaconRepo: BeaconRepository) {}

  async startBeaconSession(athleteId: string, sportType = 'Run') {
    // Generate secure 32-character random token for unauthenticated spectator URL
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const id = `bcn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const session = await this.beaconRepo.create({
      id,
      token,
      athleteId,
      sportType,
      isActive: true,
    });

    return {
      session,
      token,
      spectatorPath: `/beacon/${token}`,
    };
  }

  async pingLocation(
    token: string,
    coords: {
      latitude: number;
      longitude: number;
      altitude?: number | null;
      speedMps?: number | null;
      batteryPercentage?: number;
    }
  ) {
    const session = await this.beaconRepo.updatePing(token, coords);
    if (!session) throw new Error('Active beacon session not found');
    return session;
  }

  async getSpectatorView(token: string) {
    const data = await this.beaconRepo.findByToken(token);
    if (!data) return null;

    return {
      athlete: data.athlete,
      sportType: data.session.sportType,
      isActive: data.session.isActive,
      currentLocation: data.session.lastLatitude && data.session.lastLongitude
        ? {
            latitude: Number(data.session.lastLatitude),
            longitude: Number(data.session.lastLongitude),
            altitude: data.session.lastAltitude ? Number(data.session.lastAltitude) : null,
            speedMps: data.session.lastSpeedMps ? Number(data.session.lastSpeedMps) : null,
          }
        : null,
      batteryPercentage: data.session.batteryPercentage,
      startedAt: data.session.startedAt,
      lastPingAt: data.session.lastPingAt,
      endedAt: data.session.endedAt,
    };
  }

  async stopBeaconSession(token: string, athleteId: string) {
    await this.beaconRepo.stop(token, athleteId);
    return { success: true };
  }
}

