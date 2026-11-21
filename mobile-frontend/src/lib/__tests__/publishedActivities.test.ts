import { rememberActivityEdit, resetActivityEditsForTests } from '../activityEdits';
import { ActivityView } from '../activityView';
import { presentActivities, rememberPublishedActivity, resetPublishedForTests } from '../publishedActivities';
import { markActivityRemoved, resetRemovedForTests } from '../removedActivities';

beforeEach(() => {
  resetPublishedForTests();
  resetRemovedForTests();
  resetActivityEditsForTests();
});

const activity = (id: string, title: string, startTime: string, athleteId = 'ath_me'): ActivityView =>
  ({
    id,
    title,
    description: null,
    sportType: 'Run',
    visibility: 'PUBLIC',
    startTime,
    distanceMeters: 1000,
    movingTimeSeconds: 300,
    elapsedTimeSeconds: 300,
    elevationGainMeters: 0,
    averageSpeedMps: 3,
    maxSpeedMps: 3,
    calories: null,
    route: [],
    elevationProfile: [],
    splits: [],
    kudosCount: 0,
    hasKudos: false,
    commentsCount: 0,
    comments: [],
    athlete: { id: athleteId, displayName: 'Me', avatarUrl: null, city: null },
  }) as ActivityView;

describe('presentActivities', () => {
  it('keeps other athletes and puts a just-published activity first until the server list contains it', () => {
    const theirs = activity('theirs', 'Theirs', '2026-11-21T10:00:00.000Z', 'ath_other');
    const older = activity('older', 'Older', '2026-11-21T09:00:00.000Z');
    rememberPublishedActivity(activity('new', 'Just published', '2026-11-21T12:00:00.000Z'));
    const shown = presentActivities([theirs, older]);
    expect(shown.map((a) => a.id)).toEqual(['new', 'theirs', 'older']);
    const afterServer = presentActivities([activity('new', 'Just published', '2026-11-21T12:00:00.000Z'), theirs, older]);
    expect(afterServer.map((a) => a.id)).toEqual(['new', 'theirs', 'older']);
  });

  it('does not let a stale list or a delete bring an activity back in the wrong state', () => {
    rememberPublishedActivity(activity('gone', 'Gone', '2026-11-21T12:00:00.000Z'));
    markActivityRemoved('gone');
    expect(presentActivities([activity('keep', 'Keep', '2026-11-21T08:00:00.000Z', 'ath_other')]).map((a) => a.id)).toEqual(['keep']);
    rememberActivityEdit('keep', { title: 'Renamed', description: null, sportType: 'Walk', visibility: 'PUBLIC' });
    const stale = presentActivities([activity('keep', 'Keep', '2026-11-21T08:00:00.000Z', 'ath_other')]);
    expect(stale[0]).toMatchObject({ title: 'Renamed', sportType: 'Walk' });
  });
});
