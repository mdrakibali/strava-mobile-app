import { and, eq, inArray, ne, or, SQL, sql } from 'drizzle-orm';
import { activities, follows } from '../db/schema';

/**
 * Single authorization policy for activity visibility (ADR-12, technical audit PRIV-01/02/06).
 *
 *   owner      → everything
 *   follower   → PUBLIC + FOLLOWERS_ONLY
 *   anyone     → PUBLIC
 *   ONLY_ME    → owner only, everywhere (detail, feed, profile, kudos, comments, export)
 *
 * Invisible activities are reported as 404, never 403, so their existence isn't leaked.
 */
export type Visibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'ONLY_ME';

export const VISIBILITIES: Visibility[] = ['PUBLIC', 'FOLLOWERS_ONLY', 'ONLY_ME'];

export const canViewActivity = (
  activity: { athleteId: string; visibility: string },
  viewerId: string | null | undefined,
  viewerFollowsOwner: boolean
): boolean => {
  if (viewerId && viewerId === activity.athleteId) return true;
  if (activity.visibility === 'PUBLIC') return true;
  if (activity.visibility === 'FOLLOWERS_ONLY') return Boolean(viewerId) && viewerFollowsOwner;
  return false;
};

/** SQL form of canViewActivity for list queries. */
export const visibleActivitiesWhere = (viewerId: string | null | undefined): SQL => {
  if (!viewerId) return eq(activities.visibility, 'PUBLIC');
  return or(
    eq(activities.athleteId, viewerId),
    eq(activities.visibility, 'PUBLIC'),
    and(
      eq(activities.visibility, 'FOLLOWERS_ONLY'),
      sql`exists (select 1 from ${follows} where ${follows.followerId} = ${viewerId} and ${follows.followingId} = ${activities.athleteId})`
    )
  )!;
};

/** Following feed: own activities, plus followed athletes' activities that aren't private. */
export const followingFeedWhere = (viewerId: string, followedIds: string[]): SQL =>
  followedIds.length === 0
    ? eq(activities.athleteId, viewerId)
    : or(
        eq(activities.athleteId, viewerId),
        and(inArray(activities.athleteId, followedIds), ne(activities.visibility, 'ONLY_ME'))
      )!;
