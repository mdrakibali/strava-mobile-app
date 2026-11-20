import { and, eq, inArray } from 'drizzle-orm';
import { activities } from '../db/schema';
import { decodeCursor, encodeCursor } from '../lib/cursor';
import { followingFeedWhere, visibleActivitiesWhere } from '../lib/policy';
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

    let where;
    if (tab === 'following' && dto.currentUserId) {
      const followedIds = await this.athleteRepo.getFollowedIds(dto.currentUserId);
      where = followingFeedWhere(dto.currentUserId, followedIds);
    } else if (tab === 'clubs' && dto.currentUserId) {
      const userClubIds = await this.clubRepo.getUserClubIds(dto.currentUserId);
      const allMembers = await Promise.all(userClubIds.map((cid) => this.clubRepo.getMembers(cid)));
      const memberIds = Array.from(new Set([dto.currentUserId, ...allMembers.flat().map((m) => m.athleteId)]));
      where = and(inArray(activities.athleteId, memberIds), visibleActivitiesWhere(dto.currentUserId))!;
    } else {
      where = eq(activities.visibility, 'PUBLIC');
    }

    const { items, hasNextPage, nextCursor: rawNextCursor } = await this.feedRepo.getTimeline({
      where,
      limit,
      cursor,
    });

    const enrichedFeed = items.map(({ activity, athlete, kudosCount, commentsCount }) => {
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
        // Masked polyline if not author
        polyline: isAuthor ? activity.rawPolyline || activity.maskedPolyline : activity.maskedPolyline,
        photos: activity.photos,
        athlete,
        kudosCount: Number(kudosCount || 0),
        hasKudos: false, // client will maintain optimistic kudos or fetch on detail
        commentsCount: Number(commentsCount || 0),
        createdAt: activity.createdAt,
      };
    });

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
