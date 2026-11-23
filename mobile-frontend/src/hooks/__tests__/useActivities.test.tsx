import { activityKeys } from '../useActivities';
import { queryClient } from '../../lib/queryClient';

jest.mock('../../services/api', () => ({
  api: {
    feed: {
      getFeed: jest.fn(),
    },
    activities: {
      get: jest.fn(),
      giveKudos: jest.fn(),
      removeKudos: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
  },
}));

describe('activityKeys and queryClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('generates consistent query keys', () => {
    expect(activityKeys.feed('all')).toEqual(['activities', 'feed', 'all']);
    expect(activityKeys.detail('act_123')).toEqual(['activities', 'detail', 'act_123']);
    expect(activityKeys.kudos('act_123')).toEqual(['activities', 'kudos', 'act_123']);
    expect(activityKeys.history('ath_123')).toEqual(['activities', 'history', 'ath_123']);
  });

  it('updates queryClient cache optimistically for kudos', () => {
    const feedKey = activityKeys.feed('all');
    queryClient.setQueryData(feedKey, {
      pages: [
        {
          items: [{ id: 'act_1', title: 'Test Run', kudosCount: 2, hasKudos: false }],
        },
      ],
    });

    const cachedBefore: any = queryClient.getQueryData(feedKey);
    expect(cachedBefore.pages[0].items[0].kudosCount).toBe(2);
    expect(cachedBefore.pages[0].items[0].hasKudos).toBe(false);

    // Simulate optimistic update
    queryClient.setQueriesData({ queryKey: ['activities', 'feed'] }, (old: any) => ({
      ...old,
      pages: old.pages.map((p: any) => ({
        ...p,
        items: p.items.map((i: any) =>
          i.id === 'act_1' ? { ...i, hasKudos: true, kudosCount: 3 } : i
        ),
      })),
    }));

    const cachedAfter: any = queryClient.getQueryData(feedKey);
    expect(cachedAfter.pages[0].items[0].kudosCount).toBe(3);
    expect(cachedAfter.pages[0].items[0].hasKudos).toBe(true);
  });
});
