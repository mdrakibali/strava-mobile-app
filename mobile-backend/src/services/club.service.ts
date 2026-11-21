import { ClubRepository } from '../repositories/club.repository';

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

  async createClub(creatorId: string, data: { name: string; sportType?: string; city?: string; country?: string; description?: string; isPrivate?: boolean }) {
    const clubId = `clb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const club = await this.clubRepo.create({
      id: clubId,
      name: data.name.trim(),
      sportType: data.sportType || 'Run',
      city: data.city || 'Dhaka',
      country: data.country || 'Bangladesh',
      description: data.description || null,
      isPrivate: Boolean(data.isPrivate),
      creatorId,
      avatarUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400',
      bannerUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200',
    });

    await this.clubRepo.addMember(clubId, creatorId, 'OWNER');
    return club;
  }

  async toggleMembership(clubId: string, athleteId: string) {
    const club = await this.clubRepo.findById(clubId);
    if (!club) throw new Error('Club not found');

    const membership = await this.clubRepo.getMembership(clubId, athleteId);

    if (membership) {
      if (membership.role === 'OWNER') {
        throw new Error('Club owner cannot leave club. Transfer ownership or delete club.');
      }
      await this.clubRepo.removeMember(clubId, athleteId);
      return { isMember: false, membersCount: await this.clubRepo.getMemberCount(clubId) };
    } else {
      await this.clubRepo.addMember(clubId, athleteId, 'MEMBER');
      return { isMember: true, membersCount: await this.clubRepo.getMemberCount(clubId) };
    }
  }
}
