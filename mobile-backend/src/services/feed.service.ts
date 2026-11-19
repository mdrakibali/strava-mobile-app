import { decodeCursor, encodeCursor } from '../lib/cursor';
import { ActivityRepository } from '../repositories/activity.repository';
import { AthleteRepository } from '../repositories/athlete.repository';
import { ClubRepository } from '../repositories/club.repository';
import { FeedRepository } from '../repositories/feed.repository';

export interface FeedRequestDTO {
  tab?: 'following' | 'all' | 'clubs';
  cursor?: string | null;
  limit?: number;
  currentUserId?: string;
}

export class FeedService {
  constructor(
    private feedRepo: FeedRepository,
    private activityRepo: ActivityRepository,
    private athleteRepo: AthleteRepository,
    private clubRepo: ClubRepository
  ) {}

  async getFeed(dto: FeedRequestDTO) {
    const tab = dto.tab || 'all';
    const limit = Math.min(50, Math.max(1, dto.limit || 15));
    const cursor = decodeCursor(dto.cursor);

    let targetAthleteIds: string[] | null = null;
    let publicOnly = false;

    if (tab === 'following' && dto.currentUserId) {
      const followedIds = await this.athleteRepo.getFollowedIds(dto.currentUserId);
      targetAthleteIds = [dto.currentUserId, ...followedIds];
    } else if (tab === 'clubs' && dto.currentUserId) {
      const userClubIds = await this.clubRepo.getUserClubIds(dto.currentUserId);
      if (userClubIds.length > 0) {
        // Collect members of all user's clubs
        const allMembers = await Promise.all(
          userClubIds.map((cid) => this.clubRepo.getMembers(cid))
        );
        const uniqueMemberIds = Array.from(
          new Set(allMembers.flat().map((m) => m.athleteId))
        );
        targetAthleteIds = uniqueMemberIds;
      } else {
        targetAthleteIds = [dto.currentUserId];
      }
    } else {
      // 'all' tab or unauthenticated
      publicOnly = true;
    }

    const { items, hasNextPage, nextCursor: rawNextCursor } = await this.feedRepo.getTimeline({
      athleteIds: targetAthleteIds,
      publicOnly,
      limit,
      cursor,
    });

    // Enrich activities
    const enrichedFeed = await Promise.all(
      items.map(async ({ activity, athlete }) => {
        const kudosCount = await this.activityRepo.getKudosCount(activity.id);
        const hasKudos = dto.currentUserId
          ? await this.activityRepo.hasKudos(activity.id, dto.currentUserId)
          : false;
        const comments = await this.activityRepo.getComments(activity.id);

        const isAuthor = dto.currentUserId && dto.currentUserId === activity.athleteId;

        return {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          sportType: activity.sportType,
          visibility: activity.visibility,
          startTime: activity.startTime,
          distanceMeters: Number(activity.distanceMeters),
          movingTimeSeconds: activity.movingTimeSeconds,
          elapsedTimeSeconds: activity.elapsedTimeSeconds,
          elevationGainMeters: activity.elevationGainMeters,
          averageSpeedMps: activity.averageSpeedMps ? Number(activity.averageSpeedMps) : null,
          maxSpeedMps: activity.maxSpeedMps ? Number(activity.maxSpeedMps) : null,
          averageHeartRate: activity.averageHeartRate,
          calories: activity.calories,
          relativeEffortScore: activity.relativeEffortScore,
          gapFormatted: activity.gapFormatted,
          // Raw polyline is redacted unless the viewer is the author
          polyline: isAuthor ? (activity.rawPolyline || activity.maskedPolyline) : activity.maskedPolyline,
          photos: activity.photos,
          athlete,
          kudosCount,
          hasKudos,
          commentsCount: comments.length,
          createdAt: activity.createdAt,
        };
      })
    );

    const encodedNextCursor = rawNextCursor
      ? encodeCursor(rawNextCursor.timestamp, rawNextCursor.id)
      : null;

    return {
      feed: enrichedFeed,
      count: enrichedFeed.length,
      tab,
      hasNextPage,
      nextCursor: encodedNextCursor,
    };
  }
}
