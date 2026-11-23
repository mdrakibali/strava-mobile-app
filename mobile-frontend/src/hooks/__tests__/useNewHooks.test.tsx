import { queryClient } from '../../lib/queryClient';
import { ATHLETE_QUERY_KEY } from '../useAthletes';
import { GOALS_QUERY_KEY } from '../useGoals';
import { MESSAGES_QUERY_KEY } from '../useMessages';
import { PRIVACY_ZONES_KEY } from '../usePrivacyZones';
import { PLACES_QUERY_KEY, ROUTES_QUERY_KEY } from '../useRoutes';

describe('React Query hooks caching and key consistency', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('manages goals cache keys and updates', () => {
    expect(GOALS_QUERY_KEY).toEqual(['goals']);

    const sampleGoals = [{ id: 'goal_1', title: '50k', targetValue: 50 }];
    queryClient.setQueryData(GOALS_QUERY_KEY, sampleGoals);

    const cached = queryClient.getQueryData<any[]>(GOALS_QUERY_KEY);
    expect(cached).toHaveLength(1);
    expect(cached![0].title).toBe('50k');

    // delete goal update
    queryClient.setQueryData(
      GOALS_QUERY_KEY,
      cached!.filter((g) => g.id !== 'goal_1')
    );
    expect(queryClient.getQueryData(GOALS_QUERY_KEY)).toEqual([]);
  });

  it('manages routes and places keys and cache', () => {
    expect(ROUTES_QUERY_KEY).toEqual(['routes']);
    expect(PLACES_QUERY_KEY).toEqual(['places']);

    const routeKey = [...ROUTES_QUERY_KEY, 'detail', 'r_1'];
    queryClient.setQueryData(routeKey, { id: 'r_1', name: 'Dhanmondi Lake Loop', isSaved: false });

    const route = queryClient.getQueryData<any>(routeKey);
    expect(route.name).toBe('Dhanmondi Lake Loop');
    expect(route.isSaved).toBe(false);

    // Save toggle
    queryClient.setQueryData(routeKey, { ...route, isSaved: true });
    expect(queryClient.getQueryData<any>(routeKey).isSaved).toBe(true);
  });

  it('manages athletes cache and follow updates', () => {
    const profileKey = [...ATHLETE_QUERY_KEY, 'profile', 'ath_1'];
    queryClient.setQueryData(profileKey, {
      athlete: { id: 'ath_1', displayName: 'Jane Doe', followersCount: 5, isFollowing: false },
    });

    const cached = queryClient.getQueryData<any>(profileKey);
    expect(cached.athlete.displayName).toBe('Jane Doe');

    // Follow toggle
    queryClient.setQueryData(profileKey, {
      athlete: {
        ...cached.athlete,
        isFollowing: true,
        followersCount: 6,
      },
    });

    const updated = queryClient.getQueryData<any>(profileKey);
    expect(updated.athlete.isFollowing).toBe(true);
    expect(updated.athlete.followersCount).toBe(6);
  });

  it('manages messages and conversation thread cache', () => {
    const conversationsKey = [...MESSAGES_QUERY_KEY, 'conversations'];
    queryClient.setQueryData(conversationsKey, [
      { id: 'chat_1', lastMessage: 'See you on the trail!', unreadCount: 1 },
    ]);

    expect(queryClient.getQueryData<any[]>(conversationsKey)![0].lastMessage).toBe(
      'See you on the trail!'
    );

    const threadKey = [...MESSAGES_QUERY_KEY, 'thread', 'chat_1'];
    queryClient.setQueryData(threadKey, {
      messages: [{ id: 'm_1', text: 'Hello' }],
      chatId: 'chat_1',
    });

    const thread = queryClient.getQueryData<any>(threadKey);
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].text).toBe('Hello');
  });

  it('manages privacy zones cache and optimistic delete', () => {
    const zones = [
      { id: 'pz_1', name: 'Home', radiusMeters: 500 },
      { id: 'pz_2', name: 'Office', radiusMeters: 200 },
    ];
    queryClient.setQueryData(PRIVACY_ZONES_KEY, zones);

    const cached = queryClient.getQueryData<any[]>(PRIVACY_ZONES_KEY);
    expect(cached).toHaveLength(2);

    queryClient.setQueryData(
      PRIVACY_ZONES_KEY,
      cached!.filter((z) => z.id !== 'pz_1')
    );
    expect(queryClient.getQueryData<any[]>(PRIVACY_ZONES_KEY)).toHaveLength(1);
    expect(queryClient.getQueryData<any[]>(PRIVACY_ZONES_KEY)![0].name).toBe('Office');
  });
});
