import { api } from '../services/api';

/**
 * Give kudos — never take it back (Strava: "No takebacks!", research §14).
 * The backend only exposes a toggle, and the feed does not report whether the viewer already
 * gave kudos, so a blind toggle could REMOVE an existing kudos. When state is unknown we read
 * the activity first and only call the toggle if kudos is not yet given.
 */
export async function giveKudos(
  activityId: string,
  knownHasKudos: boolean | null
): Promise<{ hasKudos: boolean; kudosCount: number }> {
  if (knownHasKudos === null) {
    const detail = await api.activities.get(activityId);
    if (detail?.hasKudos) {
      return { hasKudos: true, kudosCount: Number(detail.kudosCount) || 0 };
    }
  } else if (knownHasKudos) {
    throw new Error('Kudos already given');
  }
  const res = await api.activities.toggleKudos(activityId);
  if (!res.hasKudos) {
    // Lost a race (kudos existed after all) and the toggle removed it — restore it.
    return api.activities.toggleKudos(activityId);
  }
  return res;
}

/** Follow/unfollow via the backend toggle; returns the server's resulting state. */
export async function setFollowing(athleteId: string, currentlyFollowing: boolean, wantFollowing: boolean) {
  if (currentlyFollowing === wantFollowing) return { isFollowing: currentlyFollowing };
  const res = await api.athletes.toggleFollow(athleteId);
  return { isFollowing: Boolean(res.isFollowing), followersCount: res.followersCount };
}
