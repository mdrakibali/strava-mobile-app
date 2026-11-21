import { changeCommentsCount, setFollowing, setKudos, socialStore } from '../social';

jest.mock('../../services/api', () => ({
  api: {
    activities: { giveKudos: jest.fn(), removeKudos: jest.fn(), addComment: jest.fn(), deleteComment: jest.fn() },
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

  it('does not let a fetch that started earlier overwrite a confirmed unlike', async () => {
    socialStore.seed([{ id: 'a6', hasKudos: true, kudosCount: 4, commentsCount: 2 }]);
    const readTick = socialStore.beginRead();
    api.activities.removeKudos.mockResolvedValue({ hasKudos: false, kudosCount: 3 });
    await setKudos('a6', false);
    socialStore.seed([{ id: 'a6', hasKudos: true, kudosCount: 4, commentsCount: 2 }], readTick);
    expect(socialStore.get('a6')).toEqual({ hasKudos: false, kudosCount: 3, commentsCount: 2 });
  });

  it('keeps the latest kudos when an older request finishes last', async () => {
    socialStore.seed([{ id: 'a7', hasKudos: false, kudosCount: 1, commentsCount: 0 }]);
    let finishLike!: (v: any) => void;
    api.activities.giveKudos.mockReturnValue(new Promise((r) => (finishLike = r)));
    const like = setKudos('a7', true);
    api.activities.removeKudos.mockResolvedValue({ hasKudos: false, kudosCount: 1 });
    await setKudos('a7', false);
    finishLike({ hasKudos: true, kudosCount: 2 });
    await like;
    expect(socialStore.get('a7')).toMatchObject({ hasKudos: false, kudosCount: 1 });
  });
});

describe('changeCommentsCount', () => {
  it('decreases by the server count and ignores a stale refetch', async () => {
    socialStore.seed([{ id: 'c1', hasKudos: false, kudosCount: 0, commentsCount: 3 }]);
    const readTick = socialStore.beginRead();
    const count = await changeCommentsCount('c1', -1, async () => 2);
    socialStore.seed([{ id: 'c1', hasKudos: false, kudosCount: 0, commentsCount: 3 }], readTick);
    expect(count).toBe(2);
    expect(socialStore.get('c1')!.commentsCount).toBe(2);
  });

  it('rolls the count back when the delete fails', async () => {
    socialStore.seed([{ id: 'c2', hasKudos: false, kudosCount: 0, commentsCount: 2 }]);
    await expect(changeCommentsCount('c2', -1, async () => Promise.reject(new Error('nope')))).rejects.toThrow('nope');
    expect(socialStore.get('c2')!.commentsCount).toBe(2);
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
