import { api } from '../../services/api';
import { giveKudos, setFollowing } from '../social';

jest.mock('../../services/api', () => ({
  api: {
    activities: { get: jest.fn(), toggleKudos: jest.fn() },
    athletes: { toggleFollow: jest.fn() },
  },
}));

const mocked = api as unknown as {
  activities: { get: jest.Mock; toggleKudos: jest.Mock };
  athletes: { toggleFollow: jest.Mock };
};

beforeEach(() => jest.clearAllMocks());

describe('giveKudos — never takes kudos back', () => {
  it('unknown state + already given → reads detail and does NOT toggle (a blind toggle would remove it)', async () => {
    mocked.activities.get.mockResolvedValue({ hasKudos: true, kudosCount: 7 });
    await expect(giveKudos('a1', null)).resolves.toEqual({ hasKudos: true, kudosCount: 7 });
    expect(mocked.activities.toggleKudos).not.toHaveBeenCalled();
  });

  it('unknown state + not given → toggles once', async () => {
    mocked.activities.get.mockResolvedValue({ hasKudos: false, kudosCount: 2 });
    mocked.activities.toggleKudos.mockResolvedValue({ hasKudos: true, kudosCount: 3 });
    await expect(giveKudos('a1', null)).resolves.toEqual({ hasKudos: true, kudosCount: 3 });
    expect(mocked.activities.toggleKudos).toHaveBeenCalledTimes(1);
  });

  it('known not-given → toggles without an extra read', async () => {
    mocked.activities.toggleKudos.mockResolvedValue({ hasKudos: true, kudosCount: 1 });
    await giveKudos('a1', false);
    expect(mocked.activities.get).not.toHaveBeenCalled();
  });

  it('known already-given → refuses (button is disabled in UI)', async () => {
    await expect(giveKudos('a1', true)).rejects.toThrow();
    expect(mocked.activities.toggleKudos).not.toHaveBeenCalled();
  });

  it('race: toggle reports removal → toggles back so kudos is restored', async () => {
    mocked.activities.toggleKudos
      .mockResolvedValueOnce({ hasKudos: false, kudosCount: 4 })
      .mockResolvedValueOnce({ hasKudos: true, kudosCount: 5 });
    await expect(giveKudos('a1', false)).resolves.toEqual({ hasKudos: true, kudosCount: 5 });
    expect(mocked.activities.toggleKudos).toHaveBeenCalledTimes(2);
  });
});

describe('setFollowing', () => {
  it('calls the toggle exactly once and returns the server state (old search screen toggled twice = no-op)', async () => {
    mocked.athletes.toggleFollow.mockResolvedValue({ isFollowing: true, followersCount: 9 });
    await expect(setFollowing('u2', false, true)).resolves.toEqual({ isFollowing: true, followersCount: 9 });
    expect(mocked.athletes.toggleFollow).toHaveBeenCalledTimes(1);
  });

  it('does nothing when already in the wanted state', async () => {
    await setFollowing('u2', true, true);
    expect(mocked.athletes.toggleFollow).not.toHaveBeenCalled();
  });
});
