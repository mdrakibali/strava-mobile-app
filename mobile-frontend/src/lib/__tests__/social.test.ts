import { setFollowing, setKudos, socialStore } from '../social';

jest.mock('../../services/api', () => ({
  api: {
    activities: { giveKudos: jest.fn(), removeKudos: jest.fn() },
    athletes: { follow: jest.fn(), unfollow: jest.fn() },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { api } = require('../../services/api');

beforeEach(() => jest.resetAllMocks());

describe('setKudos', () => {
  it('gives kudos optimistically and reconciles with the server count', async () => {
    socialStore.seed([{ id: 'a1', hasKudos: false, kudosCount: 4, commentsCount: 0 }]);
    let resolve!: (v: any) => void;
    api.activities.giveKudos.mockReturnValue(new Promise((r) => (resolve = r)));
    const p = setKudos('a1', true);
    expect(socialStore.get('a1')).toMatchObject({ hasKudos: true, kudosCount: 5 }); // optimistic
    resolve({ hasKudos: true, kudosCount: 7 }); // others gave kudos meanwhile
    await p;
    expect(socialStore.get('a1')).toMatchObject({ hasKudos: true, kudosCount: 7 });
  });

  it('removes kudos', async () => {
    socialStore.seed([{ id: 'a2', hasKudos: true, kudosCount: 3, commentsCount: 1 }]);
    api.activities.removeKudos.mockResolvedValue({ hasKudos: false, kudosCount: 2 });
    await setKudos('a2', false);
    expect(api.activities.removeKudos).toHaveBeenCalledWith('a2');
    expect(socialStore.get('a2')).toEqual({ hasKudos: false, kudosCount: 2, commentsCount: 1 });
  });

  it('rolls back on failure', async () => {
    socialStore.seed([{ id: 'a3', hasKudos: false, kudosCount: 1, commentsCount: 0 }]);
    api.activities.giveKudos.mockRejectedValue(new Error('offline'));
    await expect(setKudos('a3', true)).rejects.toThrow('offline');
    expect(socialStore.get('a3')).toEqual({ hasKudos: false, kudosCount: 1, commentsCount: 0 });
  });

  it('does not double count when the state already matches', async () => {
    socialStore.seed([{ id: 'a4', hasKudos: true, kudosCount: 2, commentsCount: 0 }]);
    api.activities.giveKudos.mockResolvedValue({ hasKudos: true, kudosCount: 2 });
    await setKudos('a4', true);
    expect(socialStore.get('a4')!.kudosCount).toBe(2);
  });

  it('server data seeded later overrides local state (refresh never shows stale counts)', () => {
    socialStore.patch('a5', { hasKudos: true, kudosCount: 99 });
    socialStore.seed([{ id: 'a5', hasKudos: false, kudosCount: 3, commentsCount: 2 }]);
    expect(socialStore.get('a5')).toEqual({ hasKudos: false, kudosCount: 3, commentsCount: 2 });
  });
});

describe('setFollowing', () => {
  it('uses idempotent follow / unfollow', async () => {
    api.athletes.follow.mockResolvedValue({ isFollowing: true, followersCount: 9, followingCount: 1 });
    await expect(setFollowing('u2', false, true)).resolves.toMatchObject({ isFollowing: true, followersCount: 9 });
    api.athletes.unfollow.mockResolvedValue({ isFollowing: false, followersCount: 8, followingCount: 1 });
    await expect(setFollowing('u2', true, false)).resolves.toMatchObject({ isFollowing: false, followersCount: 8 });
  });
});
