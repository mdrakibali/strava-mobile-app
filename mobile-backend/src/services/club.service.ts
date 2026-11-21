import { HttpError, notFound } from '../lib/http';
import { ClubRepository } from '../repositories/club.repository';

export interface ClubInput {
  name: string;
  sportType?: string;
  city?: string | null;
  country?: string | null;
  description?: string | null;
  isPrivate?: boolean;
}

export class ClubService {
  constructor(private clubRepo: ClubRepository) {}

  async listClubs(query?: string, athleteId?: string, onlyJoined = false) {
    let clubIds: string[] | undefined;
    if (onlyJoined && athleteId) {
      clubIds = await this.clubRepo.getUserClubIds(athleteId);
    }
    const clubs = await this.clubRepo.list(query, clubIds);

    let userMembershipsMap = new Map<string, string>();
    if (athleteId) {
      const memberships = await this.clubRepo.getUserMemberships(athleteId);
      userMembershipsMap = new Map(memberships.map((m) => [m.clubId, m.role]));
    }

    return clubs.map((club) => {
      const userRole = userMembershipsMap.get(club.id) || null;
      return {
        ...club,
        isMember: Boolean(userRole),
        userRole,
      };
    });
  }

  async getClubDetail(clubId: string, athleteId?: string) {
    const club = await this.clubRepo.findById(clubId);
    if (!club) return null;

    const membersCount = await this.clubRepo.getMemberCount(clubId);
    const membership = athleteId ? await this.clubRepo.getMembership(clubId, athleteId) : null;
    const members = await this.clubRepo.getMembers(clubId);

    // Calculate Weekly Leaderboard since Monday of current week
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now.setDate(now.getDate() + diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const memberIds = members.map((m) => m.athleteId);
    const weeklyStats = await this.clubRepo.getWeeklyStats(memberIds, monday);
    const statsMap = new Map(weeklyStats.map((s) => [s.athleteId, s]));

    const weeklyLeaderboard = members
      .map((m) => {
        const stat = statsMap.get(m.athleteId);
        return {
          athleteId: m.athleteId,
          displayName: m.displayName,
          username: m.username,
          avatarUrl: m.avatarUrl,
          role: m.role,
          distanceMeters: stat ? Number(stat.totalDistanceMeters) : 0,
          movingTimeSeconds: stat ? Number(stat.totalMovingSeconds) : 0,
          activitiesCount: stat ? Number(stat.activitiesCount) : 0,
        };
      })
      .sort((a, b) => b.distanceMeters - a.distanceMeters);

    return {
      club: {
        ...club,
        membersCount,
        isMember: Boolean(membership),
        userRole: membership?.role || null,
      },
      weeklyLeaderboard,
      members,
    };
  }

  async createClub(creatorId: string, data: ClubInput) {
    const clubId = `clb_${crypto.randomUUID()}`;
    // Nothing is invented: an empty city/country stays empty, and there is no stock photo.
    const club = await this.clubRepo.create({
      id: clubId,
      name: data.name.trim(),
      sportType: data.sportType || 'Run',
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      description: data.description?.trim() || null,
      isPrivate: Boolean(data.isPrivate),
      creatorId,
    });

    await this.clubRepo.addMember(clubId, creatorId, 'OWNER');
    return club;
  }

  async updateClub(clubId: string, athleteId: string, patch: Partial<ClubInput>) {
    const club = await this.clubRepo.findById(clubId);
    if (!club) throw notFound('Club');
    const membership = await this.clubRepo.getMembership(clubId, athleteId);
    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      throw new HttpError(403, 'forbidden', 'Only a club owner or admin can edit this club');
    }
    const values: Record<string, unknown> = {};
    if (patch.name !== undefined) values.name = patch.name.trim();
    if (patch.sportType !== undefined) values.sportType = patch.sportType;
    if (patch.city !== undefined) values.city = patch.city?.trim() || null;
    if (patch.country !== undefined) values.country = patch.country?.trim() || null;
    if (patch.description !== undefined) values.description = patch.description?.trim() || null;
    if (patch.isPrivate !== undefined) values.isPrivate = patch.isPrivate;
    return Object.keys(values).length ? this.clubRepo.update(clubId, values) : club;
  }

  async deleteClub(clubId: string, athleteId: string) {
    const club = await this.clubRepo.findById(clubId);
    if (!club) throw notFound('Club');
    const membership = await this.clubRepo.getMembership(clubId, athleteId);
    if (membership?.role !== 'OWNER') throw new HttpError(403, 'forbidden', 'Only the club owner can delete this club');
    await this.clubRepo.delete(clubId);
  }

  /**
   * `join` makes the call idempotent (retries and double taps cannot flip the state back).
   * When it is omitted the call toggles, which older app builds rely on.
   */
  async setMembership(clubId: string, athleteId: string, join?: boolean) {
    const club = await this.clubRepo.findById(clubId);
    if (!club) throw notFound('Club');

    const membership = await this.clubRepo.getMembership(clubId, athleteId);
    const wantJoin = join ?? !membership;

    if (!wantJoin && membership) {
      if (membership.role === 'OWNER') {
        throw new HttpError(409, 'owner_cannot_leave', 'The club owner cannot leave. Delete the club instead.');
      }
      await this.clubRepo.removeMember(clubId, athleteId);
    } else if (wantJoin && !membership) {
      await this.clubRepo.addMember(clubId, athleteId, 'MEMBER');
    }
    return { isMember: wantJoin, membersCount: await this.clubRepo.getMemberCount(clubId) };
  }
}
