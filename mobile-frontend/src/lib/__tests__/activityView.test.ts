import {
  avgSpeedOf,
  clearCommentTombstonesForTesting,
  fromDetailResponse,
  fromFeedItem,
  getDeletedCommentIds,
  markCommentDeleted,
  mergeCommentLists,
  toAthleteSummary,
  toRoute,
  unmarkCommentDeleted,
} from '../activityView';

const athlete = {
  id: 'ath_1',
  username: 'rakib',
  displayName: 'Rakib',
  avatarUrl: null,
  city: 'Dhaka',
};

describe('toRoute', () => {
  it('accepts object points and [lng, lat] pairs, drops invalid ones', () => {
    expect(
      toRoute([
        { latitude: 23.7, longitude: 90.4 },
        [90.41, 23.71],
        { latitude: 'x', longitude: 1 },
        { latitude: 95, longitude: 1 },
        null,
      ])
    ).toEqual([
      [90.4, 23.7],
      [90.41, 23.71],
    ]);
    expect(toRoute(undefined)).toEqual([]);
  });
});

describe('toAthleteSummary', () => {
  it('treats the shared backend stock photo as "no photo" so initials are shown', () => {
    const a = toAthleteSummary({
      ...athlete,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    });
    expect(a.avatarUrl).toBeNull();
    expect(
      toAthleteSummary({ ...athlete, avatarUrl: 'https://lh3.googleusercontent.com/a/x' }).avatarUrl
    ).toBe('https://lh3.googleusercontent.com/a/x');
  });
  it('does not invent a city', () => {
    expect(toAthleteSummary({ id: '1', displayName: 'X' }).city).toBeNull();
  });
});

describe('fromFeedItem', () => {
  it('maps the feed payload including the viewer kudos state reported by the server', () => {
    const v = fromFeedItem({
      id: 'act_1',
      title: 'Morning Run',
      sportType: 'Run',
      visibility: 'PUBLIC',
      startTime: '2026-11-19T00:42:00Z',
      distanceMeters: 5020,
      movingTimeSeconds: 1713,
      elapsedTimeSeconds: 1800,
      elevationGainMeters: 12,
      averageSpeedMps: null,
      polyline: [{ latitude: 1, longitude: 2 }],
      athlete,
      kudosCount: '3',
      hasKudos: false,
      commentsCount: 1,
    });
    expect(v.hasKudos).toBe(false);
    expect(fromFeedItem({ id: 'x', athlete }).hasKudos).toBeNull(); // field absent (old server) = unknown
    expect(v.kudosCount).toBe(3);
    expect(v.route).toEqual([[2, 1]]);
    expect(v.averageSpeedMps).toBeNull(); // old mapper invented 3.0
    expect(avgSpeedOf(v)).toBeCloseTo(5020 / 1713);
  });
});

describe('fromDetailResponse', () => {
  const row = {
    id: 'act_9',
    title: 'Evening Ride',
    sportType: 'Ride',
    visibility: 'FOLLOWERS_ONLY',
    startTime: '2026-11-19T12:00:00Z',
    distanceMeters: '25000.00', // decimal columns arrive as strings
    movingTimeSeconds: 3600,
    elapsedTimeSeconds: 3700,
    elevationGainMeters: 80,
    averageSpeedMps: '6.94',
    maxSpeedMps: '11.20',
    calories: 600,
    rawPolyline: null,
    maskedPolyline: [
      { latitude: 23.7, longitude: 90.4 },
      { latitude: 23.71, longitude: 90.41 },
    ],
    splits: [
      { splitNumber: 1, paceFormatted: '5:41 /km', elevationDeltaMeters: 3, averageHeartRate: 154 },
    ],
    elevationProfile: [10, '12', null],
  };

  it('reads top-level kudos/comments/athlete (the old screen read them from activity → always empty)', () => {
    const v = fromDetailResponse({
      activity: row,
      athlete,
      kudosCount: 4,
      hasKudos: true,
      comments: [
        { id: 'c1', content: 'Nice!', createdAt: '2026-11-19T13:00:00Z', author: athlete },
      ],
      commentsCount: 1,
      isOwner: false,
    });
    expect(v.kudosCount).toBe(4);
    expect(v.hasKudos).toBe(true);
    expect(v.comments).toHaveLength(1);
    expect(v.comments[0].author.displayName).toBe('Rakib');
    expect(v.athlete.city).toBe('Dhaka');
  });

  it('uses the masked polyline for non-owners and parses decimal strings', () => {
    const v = fromDetailResponse({
      activity: row,
      athlete,
      kudosCount: 0,
      hasKudos: false,
      comments: [],
    });
    expect(v.route).toHaveLength(2);
    expect(v.distanceMeters).toBe(25000);
    expect(v.maxSpeedMps).toBeCloseTo(11.2);
    expect(v.elevationProfile).toEqual([10, 12]);
  });

  it('prefers the raw polyline when the owner receives it', () => {
    const v = fromDetailResponse({
      activity: {
        ...row,
        rawPolyline: [
          { latitude: 1, longitude: 1 },
          { latitude: 2, longitude: 2 },
          { latitude: 3, longitude: 3 },
        ],
      },
      athlete,
    });
    expect(v.route).toHaveLength(3);
  });

  it('strips the unit from split pace and drops recorder heart-rate', () => {
    const v = fromDetailResponse({ activity: row, athlete });
    expect(v.splits[0]).toEqual({ index: 1, pace: '5:41', elevationDeltaMeters: 3 });
  });

  it('does not treat a missing kudos flag as not liked', () => {
    expect(fromDetailResponse({ activity: row, athlete }).hasKudos).toBeNull();
  });
});

const comment = (id: string, content: string) => ({
  id,
  content,
  createdAt: '2026-11-21T00:00:00.000Z',
  updatedAt: null,
  author: toAthleteSummary(athlete),
});

describe('mergeCommentLists', () => {
  beforeEach(() => {
    clearCommentTombstonesForTesting();
  });

  it('keeps comments already on screen when a refetch comes back empty but the count is not zero', () => {
    const current = [comment('c1', 'Nice')];
    expect(mergeCommentLists(current, [], 1)).toEqual(current);
  });

  it('shows the empty state only when the server count is zero', () => {
    expect(mergeCommentLists([comment('c1', 'Nice')], [], 0)).toEqual([]);
  });

  it('does not re-merge a locally deleted comment from stale incoming props', () => {
    const c1 = comment('c1', 'Great run!');
    const c2 = comment('c2', 'Delete me');
    const initial = [c1, c2];

    markCommentDeleted('act_1', 'c2');
    const tombstones = getDeletedCommentIds('act_1');

    // User deleted c2 locally, current state is [c1]
    const current = [c1];
    // incoming props are still stale and contain [c1, c2]
    const merged = mergeCommentLists(current, initial, 1, tombstones);

    expect(merged.map((c) => c.id)).toEqual(['c1']);
    expect(merged.some((c) => c.id === 'c2')).toBe(false);
  });

  it('restores a deleted comment if deletion failed and tombstone is removed', () => {
    const c1 = comment('c1', 'Great run!');
    const c2 = comment('c2', 'Keep me');

    markCommentDeleted('act_1', 'c2');
    expect(getDeletedCommentIds('act_1').has('c2')).toBe(true);

    unmarkCommentDeleted('act_1', 'c2');
    expect(getDeletedCommentIds('act_1').has('c2')).toBe(false);

    const merged = mergeCommentLists([c1], [c1, c2], 2, getDeletedCommentIds('act_1'));
    expect(merged.map((c) => c.id)).toEqual(['c1', 'c2']);
  });
});
