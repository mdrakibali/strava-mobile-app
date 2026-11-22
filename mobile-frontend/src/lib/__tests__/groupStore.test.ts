import { groupStore } from '../groupStore';
import { api } from '../../services/api';

jest.mock('../../services/api', () => ({
  api: {
    clubs: {
      join: jest.fn(),
    },
    challenges: {
      join: jest.fn(),
    },
    events: {
      rsvp: jest.fn(),
    },
  },
}));

describe('groupStore', () => {
  beforeEach(() => {
    groupStore.resetForTesting();
    jest.clearAllMocks();
  });

  describe('Clubs synchronization & optimistic updates', () => {
    it('seeds clubs and retrieves state', () => {
      groupStore.seedClubs([
        { id: 'c1', name: 'Running Club', isMember: false, memberCount: 10, sportType: 'Run' },
      ]);
      const club = groupStore.getClub('c1');
      expect(club).toBeDefined();
      expect(club?.name).toBe('Running Club');
      expect(club?.isMember).toBe(false);
      expect(club?.memberCount).toBe(10);
    });

    it('optimistically joins a club and reconciles with server response', async () => {
      groupStore.seedClubs([
        { id: 'c1', name: 'Running Club', isMember: false, memberCount: 10 },
      ]);

      (api.clubs.join as jest.Mock).mockResolvedValueOnce({
        isMember: true,
        membersCount: 11,
      });

      const promise = groupStore.joinClub('c1', true);
      // Immediately optimistic
      expect(groupStore.getClub('c1')?.isMember).toBe(true);
      expect(groupStore.getClub('c1')?.memberCount).toBe(11);

      await promise;
      expect(groupStore.getClub('c1')?.isMember).toBe(true);
      expect(groupStore.getClub('c1')?.memberCount).toBe(11);
    });

    it('rolls back club state on API error', async () => {
      groupStore.seedClubs([
        { id: 'c1', name: 'Running Club', isMember: false, memberCount: 10 },
      ]);

      (api.clubs.join as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(groupStore.joinClub('c1', true)).rejects.toThrow('Network error');
      // Rolled back
      expect(groupStore.getClub('c1')?.isMember).toBe(false);
      expect(groupStore.getClub('c1')?.memberCount).toBe(10);
    });

    it('removes club and prevents re-seeding', () => {
      groupStore.seedClubs([{ id: 'c1', name: 'Club 1', isMember: true, memberCount: 5 }]);
      expect(groupStore.getClub('c1')).toBeDefined();

      groupStore.remove('c1');
      expect(groupStore.isRemoved('c1')).toBe(true);
      expect(groupStore.getClub('c1')).toBeUndefined();

      // Trying to re-seed should be ignored
      groupStore.seedClubs([{ id: 'c1', name: 'Club 1', isMember: true, memberCount: 5 }]);
      expect(groupStore.getClub('c1')).toBeUndefined();
    });
  });

  describe('Challenges synchronization & optimistic updates', () => {
    it('seeds challenges and updates join status optimistically with rollback', async () => {
      groupStore.seedChallenges([
        { id: 'ch1', title: '100k Challenge', isJoined: false, participantsCount: 42 },
      ]);

      (api.challenges.join as jest.Mock).mockResolvedValueOnce({
        isJoined: true,
        participantsCount: 43,
      });

      const p = groupStore.joinChallenge('ch1', true);
      expect(groupStore.getChallenge('ch1')?.isJoined).toBe(true);
      expect(groupStore.getChallenge('ch1')?.participantsCount).toBe(43);

      await p;
      expect(groupStore.getChallenge('ch1')?.isJoined).toBe(true);
      expect(groupStore.getChallenge('ch1')?.participantsCount).toBe(43);
    });

    it('rolls back challenge on failure', async () => {
      groupStore.seedChallenges([
        { id: 'ch1', title: '100k Challenge', isJoined: true, participantsCount: 43 },
      ]);

      (api.challenges.join as jest.Mock).mockRejectedValueOnce(new Error('Failed to leave'));

      await expect(groupStore.joinChallenge('ch1', false)).rejects.toThrow('Failed to leave');
      expect(groupStore.getChallenge('ch1')?.isJoined).toBe(true);
      expect(groupStore.getChallenge('ch1')?.participantsCount).toBe(43);
    });
  });

  describe('Events synchronization & optimistic updates', () => {
    it('seeds and updates RSVP optimistically with rollback', async () => {
      groupStore.seedEvents([
        { id: 'ev1', title: 'Sunday Run', rsvpStatus: null, attendeesCount: 3 },
      ]);

      (api.events.rsvp as jest.Mock).mockResolvedValueOnce({
        status: 'GOING',
        attendeesCount: 4,
      });

      const p = groupStore.rsvpEvent('ev1', 'GOING');
      expect(groupStore.getEvent('ev1')?.rsvpStatus).toBe('GOING');
      expect(groupStore.getEvent('ev1')?.attendeesCount).toBe(4);

      await p;
      expect(groupStore.getEvent('ev1')?.rsvpStatus).toBe('GOING');
      expect(groupStore.getEvent('ev1')?.attendeesCount).toBe(4);
    });

    it('rolls back event RSVP on error', async () => {
      groupStore.seedEvents([
        { id: 'ev1', title: 'Sunday Run', rsvpStatus: 'GOING', attendeesCount: 4 },
      ]);

      (api.events.rsvp as jest.Mock).mockRejectedValueOnce(new Error('RSVP failed'));

      await expect(groupStore.rsvpEvent('ev1', 'DECLINED')).rejects.toThrow('RSVP failed');
      expect(groupStore.getEvent('ev1')?.rsvpStatus).toBe('GOING');
      expect(groupStore.getEvent('ev1')?.attendeesCount).toBe(4);
    });
  });

  describe('Stale read race conditions', () => {
    it('does not overwrite newer mutation with older in-flight read', () => {
      const readTick = groupStore.beginRead();

      groupStore.seedClubs([{ id: 'c1', name: 'Club A', isMember: false, memberCount: 10 }]);
      groupStore.patchClub('c1', { isMember: true, memberCount: 11 });
      groupStore.noteMutation('c1');

      // Now an older in-flight response arrives from when readTick was taken
      groupStore.seedClubs(
        [{ id: 'c1', name: 'Club A', isMember: false, memberCount: 10 }],
        readTick
      );

      // Must NOT be overwritten
      expect(groupStore.getClub('c1')?.isMember).toBe(true);
      expect(groupStore.getClub('c1')?.memberCount).toBe(11);
    });
  });
});

