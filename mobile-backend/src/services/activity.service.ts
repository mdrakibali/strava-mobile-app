import { LatLngPoint, maskPolylineWithPrivacyZones } from '../lib/privacy';
import { ActivityRepository } from '../repositories/activity.repository';
import { ChallengeRepository } from '../repositories/challenge.repository';
import { GearRepository } from '../repositories/gear.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { PrivacyZoneRepository } from '../repositories/privacy-zone.repository';

export interface CreateActivityDTO {
  athleteId: string;
  athleteUsername: string;
  title: string;
  description?: string;
  sportType?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';
  startTime?: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elapsedTimeSeconds?: number;
  elevationGainMeters?: number;
  averageSpeedMps?: number;
  maxSpeedMps?: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
  rawPolyline?: LatLngPoint[];
  splits?: any[];
  elevationProfile?: number[];
  photos?: string[];
  gearId?: string;
}

export class ActivityService {
  constructor(
    private activityRepo: ActivityRepository,
    private privacyRepo: PrivacyZoneRepository,
    private challengeRepo: ChallengeRepository,
    private gearRepo: GearRepository,
    private notifRepo: NotificationRepository
  ) {}

  async createActivity(dto: CreateActivityDTO) {
    // 1. Fetch active privacy zones to mask coordinates
    const userZones = await this.privacyRepo.findActiveByAthlete(dto.athleteId);
    const maskedPolyline = maskPolylineWithPrivacyZones(dto.rawPolyline || [], userZones);

    // 2. Compute physiological stats (GAP pace, Relative Effort TRIMP)
    const avgSpeed =
      dto.averageSpeedMps ||
      (dto.movingTimeSeconds > 0 ? dto.distanceMeters / dto.movingTimeSeconds : 0);
    const paceSecondsPerKm = avgSpeed > 0 ? 1000 / avgSpeed : 0;
    const paceMinutes = Math.floor(paceSecondsPerKm / 60);
    const paceSeconds = Math.floor(paceSecondsPerKm % 60);
    const gapFormatted = `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds} /km`;

    const relativeEffortScore = dto.averageHeartRate
      ? Math.min(100, Math.round((dto.averageHeartRate / 185) * (dto.movingTimeSeconds / 60) * 1.5))
      : Math.min(100, Math.round((dto.movingTimeSeconds / 1800) * 35));

    const activityId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // 3. Save activity
    const activity = await this.activityRepo.create({
      id: activityId,
      athleteId: dto.athleteId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      sportType: dto.sportType || 'Run',
      visibility: dto.visibility || 'PUBLIC',
      startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
      distanceMeters: String(dto.distanceMeters),
      movingTimeSeconds: dto.movingTimeSeconds,
      elapsedTimeSeconds: dto.elapsedTimeSeconds || dto.movingTimeSeconds,
      elevationGainMeters: dto.elevationGainMeters || 0,
      averageSpeedMps: String(avgSpeed.toFixed(2)),
      maxSpeedMps: dto.maxSpeedMps ? String(dto.maxSpeedMps.toFixed(2)) : null,
      averageHeartRate: dto.averageHeartRate || null,
      maxHeartRate: dto.maxHeartRate || null,
      calories: dto.calories || Math.round(dto.distanceMeters * 0.06),
      relativeEffortScore,
      gapFormatted,
      rawPolyline: dto.rawPolyline || [],
      maskedPolyline,
      splits: dto.splits || [],
      elevationProfile: dto.elevationProfile || [],
      photos: dto.photos || [],
      gearId: dto.gearId || null,
    });

    // 4. Update Gear usage
    if (dto.gearId) {
      await this.gearRepo.incrementDistance(dto.gearId, dto.athleteId, dto.distanceMeters);
    }

    // 5. Update Challenges Progress
    try {
      const activeChallenges = await this.challengeRepo.getActiveParticipationsForAthlete(dto.athleteId);
      for (const ch of activeChallenges) {
        if (!ch.sportType || ch.sportType.toLowerCase() === (dto.sportType || 'Run').toLowerCase()) {
          const updatedMeters = ch.currentMeters + dto.distanceMeters;
          const isCompleted = updatedMeters >= ch.targetMeters;

          await this.challengeRepo.updateProgress(ch.challengeId, dto.athleteId, updatedMeters, isCompleted);

          if (isCompleted) {
            await this.notifRepo.create({
              id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              recipientId: dto.athleteId,
              actorId: dto.athleteId,
              actionType: 'CHALLENGE_WON',
              targetActivityId: activityId,
              message: `Trophy Unlocked! You finished the challenge "${ch.challengeTitle}"!`,
            });
          }
        }
      }
    } catch (err) {
      console.warn('Challenge progress update error:', err);
    }

    return activity;
  }

  async getActivityDetail(activityId: string, viewerAthleteId?: string) {
    const row = await this.activityRepo.findById(activityId);
    if (!row) return null;

    const { activity, athlete } = row;
    const isOwner = viewerAthleteId && viewerAthleteId === activity.athleteId;

    const kudosCount = await this.activityRepo.getKudosCount(activityId);
    const hasKudos = viewerAthleteId
      ? await this.activityRepo.hasKudos(activityId, viewerAthleteId)
      : false;
    const comments = await this.activityRepo.getComments(activityId);

    return {
      activity: {
        ...activity,
        // Strip raw GPS from non-owners to protect privacy
        rawPolyline: isOwner ? activity.rawPolyline : null,
      },
      athlete,
      kudosCount,
      hasKudos,
      comments,
      commentsCount: comments.length,
      isOwner,
    };
  }

  async toggleKudos(activityId: string, actorId: string, actorUsername: string) {
    const row = await this.activityRepo.findById(activityId);
    if (!row) throw new Error('Activity not found');

    const result = await this.activityRepo.toggleKudos(activityId, actorId);
    const kudosCount = await this.activityRepo.getKudosCount(activityId);

    // Notify author if new kudos given and actor != author
    if (result.hasKudos && row.activity.athleteId !== actorId) {
      await this.notifRepo.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: row.activity.athleteId,
        actorId,
        actionType: 'KUDOS',
        targetActivityId: activityId,
        message: `${actorUsername} gave you kudos on "${row.activity.title}"!`,
      });
    }

    return { hasKudos: result.hasKudos, kudosCount };
  }

  async addComment(activityId: string, actorId: string, actorUsername: string, content: string, parentCommentId?: string) {
    const row = await this.activityRepo.findById(activityId);
    if (!row) throw new Error('Activity not found');

    const comment = await this.activityRepo.addComment(activityId, actorId, content, parentCommentId);

    if (row.activity.athleteId !== actorId) {
      await this.notifRepo.create({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: row.activity.athleteId,
        actorId,
        actionType: 'COMMENT',
        targetActivityId: activityId,
        message: `${actorUsername} commented: "${content.slice(0, 50)}"`,
      });
    }

    return comment;
  }

  async generateGpx(activityId: string) {
    const row = await this.activityRepo.findById(activityId);
    if (!row) return null;

    const points = (row.activity.rawPolyline || row.activity.maskedPolyline || []) as LatLngPoint[];

    const trkpts = points
      .map(
        (p) =>
          `      <trkpt lat="${p.latitude}" lon="${p.longitude}">
          ${p.altitude !== undefined && p.altitude !== null ? `<ele>${p.altitude}</ele>` : ''}
          ${p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : ''}
        </trkpt>`
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="OpenStrava" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${row.activity.title}</name>
    <time>${new Date(row.activity.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${row.activity.title}</name>
    <type>${row.activity.sportType}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  }
}
