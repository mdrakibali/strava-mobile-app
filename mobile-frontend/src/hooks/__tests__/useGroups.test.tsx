import { groupKeys } from '../useGroups';
import { queryClient } from '../../lib/queryClient';

describe('groupKeys and queryClient caching', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('generates consistent query keys', () => {
    expect(groupKeys.challenges()).toEqual(['groups', 'challenges']);
    expect(groupKeys.challengeDetail('ch_1')).toEqual(['groups', 'challenges', 'ch_1']);
    expect(groupKeys.clubs()).toEqual(['groups', 'clubs', { query: '', filter: '' }]);
    expect(groupKeys.clubDetail('cl_1')).toEqual(['groups', 'clubs', 'detail', 'cl_1']);
    expect(groupKeys.events()).toEqual(['groups', 'events']);
    expect(groupKeys.eventDetail('ev_1')).toEqual(['groups', 'events', 'detail', 'ev_1']);
  });

  it('updates challenges cache correctly', () => {
    const key = groupKeys.challenges();
    queryClient.setQueryData(key, [
      { id: 'ch_1', title: '50k challenge', isJoined: false, participantsCount: 10 },
    ]);

    // Optimistically toggle join
    queryClient.setQueryData(key, (old: any) =>
      old.map((ch: any) =>
        ch.id === 'ch_1' ? { ...ch, isJoined: true, participantsCount: 11 } : ch
      )
    );

    const updated: any = queryClient.getQueryData(key);
    expect(updated[0].isJoined).toBe(true);
    expect(updated[0].participantsCount).toBe(11);
  });

  it('updates clubs cache correctly', () => {
    const key = groupKeys.clubs();
    queryClient.setQueryData(key, [
      { id: 'cl_1', name: 'Cycling Club', isMember: false, memberCount: 5 },
    ]);

    // Optimistically toggle join
    queryClient.setQueryData(key, (old: any) =>
      old.map((cl: any) => (cl.id === 'cl_1' ? { ...cl, isMember: true, memberCount: 6 } : cl))
    );

    const updated: any = queryClient.getQueryData(key);
    expect(updated[0].isMember).toBe(true);
    expect(updated[0].memberCount).toBe(6);
  });

  it('updates events cache correctly', () => {
    const key = groupKeys.events();
    queryClient.setQueryData(key, [
      { id: 'ev_1', title: 'Morning Ride', rsvpStatus: null, attendeesCount: 3 },
    ]);

    // Optimistically RSVP
    queryClient.setQueryData(key, (old: any) =>
      old.map((ev: any) =>
        ev.id === 'ev_1' ? { ...ev, rsvpStatus: 'GOING', attendeesCount: 4 } : ev
      )
    );

    const updated: any = queryClient.getQueryData(key);
    expect(updated[0].rsvpStatus).toBe('GOING');
    expect(updated[0].attendeesCount).toBe(4);
  });
});
