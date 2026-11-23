import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useActivityDetail, useDeleteActivity, useFeed, useToggleKudos, useUpdateActivity } from '../useActivities';
import { api } from '../../services/api';

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useActivities hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('useFeed fetches feed pages correctly', async () => {
    (api.feed.getFeed as jest.Mock).mockResolvedValueOnce({
      feed: [
        {
          id: 'act_1',
          title: 'Morning Run',
          sportType: 'Run',
          visibility: 'PUBLIC',
          distanceMeters: 5000,
          movingTimeSeconds: 1500,
          kudosCount: 2,
          hasKudos: false,
          commentsCount: 1,
          athlete: { id: 'ath_1', displayName: 'Rakib' },
        },
      ],
      count: 1,
      hasNextPage: false,
      nextCursor: null,
    });

    const { result } = renderHook(() => useFeed('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].items[0].title).toBe('Morning Run');
    expect(result.current.data?.pages[0].items[0].kudosCount).toBe(2);
  });

  it('useActivityDetail fetches single activity detail', async () => {
    (api.activities.get as jest.Mock).mockResolvedValueOnce({
      activity: {
        id: 'act_1',
        title: 'Morning Run',
        sportType: 'Run',
        visibility: 'PUBLIC',
        distanceMeters: 5000,
        movingTimeSeconds: 1500,
      },
      athlete: { id: 'ath_1', displayName: 'Rakib' },
      kudosCount: 3,
      hasKudos: true,
      comments: [],
      isOwner: true,
    });

    const { result } = renderHook(() => useActivityDetail('act_1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.activity.title).toBe('Morning Run');
    expect(result.current.data?.isOwner).toBe(true);
  });

  it('useToggleKudos performs mutation', async () => {
    (api.activities.giveKudos as jest.Mock).mockResolvedValueOnce({
      hasKudos: true,
      kudosCount: 4,
    });

    const { result } = renderHook(() => useToggleKudos(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ activityId: 'act_1', give: true });
    });

    expect(api.activities.giveKudos).toHaveBeenCalledWith('act_1');
  });

  it('useUpdateActivity performs update mutation', async () => {
    (api.activities.update as jest.Mock).mockResolvedValueOnce({
      activity: { id: 'act_1', title: 'New Title' },
    });

    const { result } = renderHook(() => useUpdateActivity(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({
        id: 'act_1',
        patch: { title: 'New Title', sportType: 'Run', visibility: 'PUBLIC' },
      });
    });

    expect(api.activities.update).toHaveBeenCalledWith('act_1', {
      title: 'New Title',
      sportType: 'Run',
      visibility: 'PUBLIC',
    });
  });

  it('useDeleteActivity performs delete mutation', async () => {
    (api.activities.remove as jest.Mock).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDeleteActivity(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync('act_1');
    });

    expect(api.activities.remove).toHaveBeenCalledWith('act_1');
  });
});
