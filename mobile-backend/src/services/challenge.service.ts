import { HttpError, notFound } from '../lib/http';
import { ChallengeRepository } from '../repositories/challenge.repository';

export interface ChallengeInput {
  title: string;
  description?: string | null;
  sportType?: string;
  targetMeters: number;
  startDate?: string;
  endDate?: string;
}

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

    const [participants, userParticipation, participantCount] = await Promise.all([
      this.challengeRepo.getLeaderboard(challengeId),
      athleteId ? this.challengeRepo.getParticipation(challengeId, athleteId) : Promise.resolve(null),
      this.challengeRepo.getParticipantCount(challengeId),
    ]);

    return {
      challenge: {
        ...ch,
        targetMeters: Number(ch.targetMeters),
        participantsCount: participantCount,
        isJoined: Boolean(userParticipation),
        userProgress: userParticipation
          ? {
              currentMeters: Number(userParticipation.currentMeters) || 0,
              isCompleted: Boolean(userParticipation.isCompleted),
              completedAt: userParticipation.completedAt,
            }
          : null,
      },
      leaderboard: participants,
    };
  }

  /** `join` makes the call idempotent; when omitted it toggles (older app builds). */
  async setJoin(challengeId: string, athleteId: string, join?: boolean) {
    const ch = await this.challengeRepo.findById(challengeId);
    if (!ch) throw notFound('Challenge');

    const participation = await this.challengeRepo.getParticipation(challengeId, athleteId);
    const wantJoin = join ?? !participation;

    if (wantJoin && !participation) await this.challengeRepo.join(challengeId, athleteId);
    else if (!wantJoin && participation) await this.challengeRepo.leave(challengeId, athleteId);

    return { isJoined: wantJoin, participantsCount: await this.challengeRepo.getParticipantCount(challengeId) };
  }

  async createChallenge(creatorId: string, data: ChallengeInput) {
    const start = data.startDate ? new Date(data.startDate) : new Date();
    const end = data.endDate ? new Date(data.endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (end <= start) throw new HttpError(400, 'validation_failed', 'The end date must be after the start date');

    const created = await this.challengeRepo.create({
      id: `ch_${crypto.randomUUID()}`,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      sportType: data.sportType || 'Run',
      targetMeters: String(data.targetMeters),
      startDate: start,
      endDate: end,
      creatorId,
    });

    await this.challengeRepo.join(created.id, creatorId);
    return created;
  }

  async updateChallenge(id: string, athleteId: string, patch: Partial<ChallengeInput>) {
    const ch = await this.challengeRepo.findById(id);
    if (!ch) throw notFound('Challenge');
    if (ch.creatorId !== athleteId) throw new HttpError(403, 'forbidden', 'Only the challenge creator can edit it');

    const values: Record<string, unknown> = {};
    if (patch.title !== undefined) values.title = patch.title.trim();
    if (patch.description !== undefined) values.description = patch.description?.trim() || null;
    if (patch.sportType !== undefined) values.sportType = patch.sportType;
    if (patch.targetMeters !== undefined) values.targetMeters = String(patch.targetMeters);
    if (patch.startDate !== undefined) values.startDate = new Date(patch.startDate);
    if (patch.endDate !== undefined) values.endDate = new Date(patch.endDate);
    const start = (values.startDate as Date) ?? ch.startDate;
    const end = (values.endDate as Date) ?? ch.endDate;
    if (end <= start) throw new HttpError(400, 'validation_failed', 'The end date must be after the start date');

    const updated = Object.keys(values).length ? await this.challengeRepo.update(id, values) : ch;
    // Sport, window or target changed: every participant's progress must be recomputed.
    await this.challengeRepo.resyncParticipants(id);
    return updated;
  }

  async deleteChallenge(id: string, athleteId: string) {
    const ch = await this.challengeRepo.findById(id);
    if (!ch) throw notFound('Challenge');
    if (ch.creatorId !== athleteId) throw new HttpError(403, 'forbidden', 'Only the challenge creator can delete it');
    await this.challengeRepo.delete(id);
  }
}
