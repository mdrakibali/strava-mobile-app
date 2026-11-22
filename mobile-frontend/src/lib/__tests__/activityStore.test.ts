import { useActivityStore } from '../activityStore';
import { api } from '../../services/api';
import { ActivityView } from '../activityView';

jest.mock('../../services/api', () => ({
  api: {
    activities: {
      update: jest.fn(),
      giveKudos: jest.fn(),
      removeKudos: jest.fn(),
    },
  },
}));

const mockActivity = (id: string, title = 'Morning Run'): ActivityView => ({
  id,
  athlete: { id: 'ath_1', displayName: 'Rakib', avatarUrl: null, city: 'Dhaka' },
  title,
  description: 'Nice run',
  sportType: 'Run',
  visibility: 'PUBLIC',
  startTime: '2026-11-22T06:00:00Z',
  distanceMeters: 5000,
  movingTimeSeconds: 1500,
  elapsedTimeSeconds: 1600,
  elevationGainMeters: 20,
  averageSpeedMps: 3.33,
  maxSpeedMps: 4.5,
  calories: 320,
  route: [],
  elevationProfile: [],
  splits: [],
  kudosCount: 2,
  hasKudos: false,
  commentsCount: 1,
  comments: [],
});

describe('useActivityStore', () => {
  beforeEach(() => {
    useActivityStore.setState({ activities: {}, feedIds: [] });
    jest.clearAllMocks();
  });

  test('upsertActivities and setFeedIds', () => {
    const a1 = mockActivity('act_1', 'Run 1');
    const a2 = mockActivity('act_2', 'Run 2');

    useActivityStore.getState().upsertActivities([a1, a2]);
    useActivityStore.getState().setFeedIds(['act_1', 'act_2']);

    const state = useActivityStore.getState();
    expect(state.activities['act_1'].title).toBe('Run 1');
    expect(state.activities['act_2'].title).toBe('Run 2');
    expect(state.feedIds).toEqual(['act_1', 'act_2']);
  });

  test('updateActivityDetails updates optimistically and merges server response', async () => {
    const a1 = mockActivity('act_1', 'Run 1');
    useActivityStore.getState().upsertActivity(a1);

    (api.activities.update as jest.Mock).mockResolvedValueOnce({
      activity: { id: 'act_1', title: 'Updated Title', description: 'New desc', sportType: 'Ride', visibility: 'PUBLIC' },
    });

    const promise = useActivityStore.getState().updateActivityDetails('act_1', {
      title: 'Updated Title',
      description: 'New desc',
      sportType: 'Ride',
      visibility: 'PUBLIC',
    });

    // Verify optimistic update happened immediately
    expect(useActivityStore.getState().activities['act_1'].title).toBe('Updated Title');
    expect(useActivityStore.getState().activities['act_1'].sportType).toBe('Ride');

    await promise;

    expect(useActivityStore.getState().activities['act_1'].title).toBe('Updated Title');
    expect(api.activities.update).toHaveBeenCalledWith('act_1', {
      title: 'Updated Title',
      description: 'New desc',
      sportType: 'Ride',
      visibility: 'PUBLIC',
    });
  });

  test('toggleKudos optimistically likes and updates kudosCount', async () => {
    const a1 = mockActivity('act_1', 'Run 1');
    a1.kudosCount = 2;
    a1.hasKudos = false;
    useActivityStore.getState().upsertActivity(a1);

    (api.activities.giveKudos as jest.Mock).mockResolvedValueOnce({
      hasKudos: true,
      kudosCount: 3,
    });

    const promise = useActivityStore.getState().toggleKudos('act_1');

    // Optimistic check
    expect(useActivityStore.getState().activities['act_1'].hasKudos).toBe(true);
    expect(useActivityStore.getState().activities['act_1'].kudosCount).toBe(3);

    await promise;

    expect(useActivityStore.getState().activities['act_1'].hasKudos).toBe(true);
    expect(useActivityStore.getState().activities['act_1'].kudosCount).toBe(3);
  });

  test('toggleKudos rolls back on API failure', async () => {
    const a1 = mockActivity('act_1', 'Run 1');
    a1.kudosCount = 2;
    a1.hasKudos = false;
    useActivityStore.getState().upsertActivity(a1);

    (api.activities.giveKudos as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(useActivityStore.getState().toggleKudos('act_1')).rejects.toThrow('Network error');

    // Rolled back
    expect(useActivityStore.getState().activities['act_1'].hasKudos).toBe(false);
    expect(useActivityStore.getState().activities['act_1'].kudosCount).toBe(2);
  });
});
