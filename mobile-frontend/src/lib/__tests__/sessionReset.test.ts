import { activityEditFor, rememberActivityEdit } from '../activityEdits';
import { ActivityView } from '../activityView';
import { presentActivities, rememberPublishedActivity } from '../publishedActivities';
import { markActivityRemoved, withoutRemoved } from '../removedActivities';
import { resetSessionOverlays } from '../sessionReset';

const act = (id: string): ActivityView => ({ id, startTime: '2026-11-21T10:00:00.000Z', title: id, sportType: 'Run', visibility: 'PUBLIC' }) as unknown as ActivityView;

describe('resetSessionOverlays', () => {
  it('drops published, removed and edited state so the next account starts clean', () => {
    rememberPublishedActivity(act('mine'));
    markActivityRemoved('gone');
    rememberActivityEdit('e1', { title: 't', description: null, sportType: 'Run', visibility: 'PUBLIC' });
    expect(presentActivities([]).map((a) => a.id)).toEqual(['mine']);

    resetSessionOverlays();

    expect(presentActivities([])).toEqual([]);
    expect(withoutRemoved([{ id: 'gone' }])).toHaveLength(1);
    expect(activityEditFor('e1')).toBeUndefined();
  });
});
