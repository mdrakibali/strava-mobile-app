import { z } from 'zod';
import { estimateCalories } from '../../../shared/tracking/calories';
import { HttpError, notFound } from '../lib/http';
import { canViewActivity } from '../lib/policy';
import { LatLngPoint, maskPolylineWithPrivacyZones } from '../lib/privacy';
import { activityPatchSchema, legacyCreateSchema } from '../lib/validation';
import { ActivityRepository } from '../repositories/activity.repository';
import { AthleteRepository } from '../repositories/athlete.repository';
import { NotificationRepository } from '../repositories/notification.repository';
import { PrivacyZoneRepository } from '../repositories/privacy-zone.repository';

type LegacyCreate = z.infer<typeof legacyCreateSchema>;
type Patch = z.infer<typeof activityPatchSchema>;

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

const escapeXml = (s: string) =>
  s.replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch]!);

export class ActivityService {
  constructor(
    private activityRepo: ActivityRepository,
    private athleteRepo: AthleteRepository,
    private privacyRepo: PrivacyZoneRepository,
    private notifRepo: NotificationRepository
  ) {}

  /** Loads an activity and enforces the visibility policy. Invisible → 404 (existence not leaked). */
  private async loadVisible(activityId: string, viewerId: string | undefined) {
    const row = await this.activityRepo.findById(activityId);
    if (!row) throw notFound('Activity');
    const owner = row.activity.athleteId;
    const follows = viewerId && viewerId !== owner ? await this.athleteRepo.isFollowing(viewerId, owner) : false;
    if (!canViewActivity(row.activity, viewerId, follows)) throw notFound('Activity');
    return row;
  }

  private async loadOwned(activityId: string, ownerId: string) {
    const row = await this.activityRepo.findById(activityId);
    // Someone else's activity is reported as "not found" too, never as "forbidden".
    if (!row || row.activity.athleteId !== ownerId) throw notFound('Activity');
    return row;
  }

  /**
   * Legacy single-request upload (pre-batch app builds). Now validated and idempotent when the
   * client sends clientActivityId. New builds use UploadService.
   */
  async createLegacy(athleteId: string, dto: LegacyCreate) {
    if (dto.clientActivityId) {
      const existing = await this.activityRepo.findByClientId(athleteId, dto.clientActivityId);
      if (existing) return { created: false, activity: existing };
    }
    const zones = await this.privacyRepo.findActiveByAthlete(athleteId);
    const raw = (dto.rawPolyline ?? []) as LatLngPoint[];
    const avgSpeed = dto.movingTimeSeconds > 0 ? dto.distanceMeters / dto.movingTimeSeconds : null;
    const { activity, created } = await this.activityRepo.createIdempotent({
      id: newId('act'),
      athleteId,
      clientActivityId: dto.clientActivityId ?? null,
      title: dto.title,
      description: dto.description || null,
      sportType: dto.sportType,
      visibility: dto.visibility,
      startTime: dto.startTime ? new Date(dto.startTime) : new Date(),
      distanceMeters: dto.distanceMeters.toFixed(2),
      movingTimeSeconds: dto.movingTimeSeconds,
      elapsedTimeSeconds: Math.max(dto.elapsedTimeSeconds ?? dto.movingTimeSeconds, dto.movingTimeSeconds),
      elevationGainMeters: Math.round(dto.elevationGainMeters ?? 0),
      averageSpeedMps: avgSpeed != null ? avgSpeed.toFixed(2) : null,
      maxSpeedMps: dto.maxSpeedMps != null ? dto.maxSpeedMps.toFixed(2) : null,
      // No fabricated values: the old 0.06 kcal/m fallback and the invented effort score are gone.
      calories:
        dto.calories != null
          ? Math.round(dto.calories)
          : estimateCalories(dto.sportType, dto.distanceMeters, dto.movingTimeSeconds),
      rawPolyline: raw,
      maskedPolyline: maskPolylineWithPrivacyZones(raw, zones),
      splits: dto.splits ?? [],
      elevationProfile: dto.elevationProfile ?? [],
      photos: [],
    });
    return { created, activity };
  }

  async getActivityDetail(activityId: string, viewerId?: string) {
    const { activity, athlete } = await this.loadVisible(activityId, viewerId);
    const isOwner = viewerId === activity.athleteId;
    const [kudosCount, hasKudos, comments] = await Promise.all([
      this.activityRepo.getKudosCount(activityId),
      viewerId ? this.activityRepo.hasKudos(activityId, viewerId) : Promise.resolve(false),
      this.activityRepo.getComments(activityId),
    ]);
    const { clientActivityId: _cid, ...publicActivity } = activity;
    return {
      activity: {
        ...publicActivity,
        // The raw track (with home/work) goes to the owner only (PRIV-01).
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

  /** PATCH (owner only). Calories are recomputed when the sport changes (MET depends on sport). */
  async update(activityId: string, ownerId: string, patch: Patch) {
    const { activity } = await this.loadOwned(activityId, ownerId);
    const changes: Record<string, unknown> = {};
    if (patch.title !== undefined) changes.title = patch.title;
    if (patch.description !== undefined) changes.description = patch.description || null;
    if (patch.visibility !== undefined) changes.visibility = patch.visibility;
    if (patch.sportType !== undefined && patch.sportType !== activity.sportType) {
      changes.sportType = patch.sportType;
      changes.calories = estimateCalories(patch.sportType, Number(activity.distanceMeters), activity.movingTimeSeconds);
    }
    const updated = await this.activityRepo.update(activityId, changes);
    if (!updated) throw notFound('Activity');
    return this.getActivityDetail(activityId, ownerId);
  }

  async delete(activityId: string, ownerId: string) {
    await this.loadOwned(activityId, ownerId);
    await this.activityRepo.delete(activityId);
  }

  /** Kudos are give-only and idempotent (research §11: "no takebacks"); no self-kudos. */
  async giveKudos(activityId: string, actorId: string, actorUsername: string) {
    const { activity } = await this.loadVisible(activityId, actorId);
    if (activity.athleteId === actorId) throw new HttpError(422, 'self_kudos', 'You can’t give kudos to your own activity');
    const created = await this.activityRepo.addKudos(activityId, actorId);
    if (created) {
      await this.notifRepo.create({
        id: newId('notif'),
        recipientId: activity.athleteId,
        actorId,
        actionType: 'KUDOS',
        targetActivityId: activityId,
        message: `${actorUsername} gave you kudos on "${activity.title}"!`,
      });
    }
    return { hasKudos: true, kudosCount: await this.activityRepo.getKudosCount(activityId) };
  }

  async addComment(activityId: string, actorId: string, actorUsername: string, content: string, parentCommentId?: string) {
    const { activity } = await this.loadVisible(activityId, actorId);
    const comment = await this.activityRepo.addComment(activityId, actorId, content, parentCommentId);
    if (activity.athleteId !== actorId) {
      await this.notifRepo.create({
        id: newId('notif'),
        recipientId: activity.athleteId,
        actorId,
        actionType: 'COMMENT',
        targetActivityId: activityId,
        message: `${actorUsername} commented: "${content.slice(0, 50)}"`,
      });
    }
    return comment;
  }

  /** GPX export: owner only (the raw track reveals home/work), XML-escaped (PRIV-04). */
  async generateGpx(activityId: string, ownerId: string) {
    const { activity } = await this.loadOwned(activityId, ownerId);
    const points = (activity.rawPolyline || []) as LatLngPoint[];
    const trkpts = points
      .map(
        (p) =>
          `      <trkpt lat="${Number(p.latitude)}" lon="${Number(p.longitude)}">` +
          (p.altitude != null ? `<ele>${Number(p.altitude)}</ele>` : '') +
          (p.timestamp ? `<time>${new Date(p.timestamp).toISOString()}</time>` : '') +
          `</trkpt>`
      )
      .join('\n');
    const title = escapeXml(activity.title);
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx creator="OpenStrava" version="1.1" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${title}</name>
    <time>${new Date(activity.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${title}</name>
    <type>${escapeXml(activity.sportType)}</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
  }
}

export type { Patch as ActivityPatch };
