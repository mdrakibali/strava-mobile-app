import { ChallengeRepository } from '../repositories/challenge.repository';

export class ChallengeService {
  constructor(private challengeRepo: ChallengeRepository) {}

  async listChallenges(athleteId?: string) {
    const list = await this.challengeRepo.list();

    let userParticipationMap = new Map<string, { currentMeters: number; isCompleted: boolean }>();
    if (athleteId) {
      const userParts = await this.challengeRepo.getUserParticipations(athleteId);
      userParticipationMap = new Map(
        userParts.map((p) => [
          p.challengeId,
          { currentMeters: Number(p.currentMeters), isCompleted: p.isCompleted },
        ])
      );
    }

    return list.map((ch) => {
      const participation = userParticipationMap.get(ch.id);
      const now = new Date();
      const end = new Date(ch.endDate);
      const diffMs = end.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      return {
        ...ch,
        targetMeters: Number(ch.targetMeters),
        isJoined: Boolean(participation),
        currentMeters: participation ? participation.currentMeters : 0,
        isCompleted: participation ? participation.isCompleted : false,
        daysRemaining,
      };
    });
  }

  async getChallengeDetail(challengeId: string, athleteId?: string) {
    const ch = await this.challengeRepo.findById(challengeId);
    if (!ch) return null;

    const participants = await this.challengeRepo.getLeaderboard(challengeId);
    const userParticipation = athleteId
      ? participants.find((p) => p.athleteId === athleteId)
      : null;

    return {
      challenge: {
        ...ch,
        targetMeters: Number(ch.targetMeters),
        participantsCount: participants.length,
        isJoined: Boolean(userParticipation),
        userProgress: userParticipation
          ? {
              currentMeters: userParticipation.currentMeters,
              isCompleted: userParticipation.isCompleted,
              completedAt: userParticipation.completedAt,
            }
          : null,
      },
      leaderboard: participants,
    };
  }

  async toggleJoin(challengeId: string, athleteId: string) {
    const ch = await this.challengeRepo.findById(challengeId);
    if (!ch) throw new Error('Challenge not found');

    const participation = await this.challengeRepo.getParticipation(challengeId, athleteId);

    if (participation) {
      await this.challengeRepo.leave(challengeId, athleteId);
      return { isJoined: false };
    } else {
      await this.challengeRepo.join(challengeId, athleteId);
      return { isJoined: true };
    }
  }

  async createChallenge(creatorId: string, data: { title: string; description?: string; sportType?: string; targetMeters: number; startDate?: string; endDate?: string; badgeUrl?: string }) {
    const id = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await this.challengeRepo.create({
      id,
      title: data.title.trim(),
      description: data.description || null,
      sportType: data.sportType || 'Run',
      targetMeters: String(data.targetMeters),
      badgeUrl: data.badgeUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300',
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate
        ? new Date(data.endDate)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      creatorId,
    });

    await this.challengeRepo.join(id, creatorId);
    return created;
  }
}
