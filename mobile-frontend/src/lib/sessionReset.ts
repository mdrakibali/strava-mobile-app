import { resetActivityEditsForTests } from './activityEdits';
import { resetPublishedForTests } from './publishedActivities';
import { resetRemovedForTests } from './removedActivities';

/**
 * The activity overlays (published / edited / removed) are per-device module state. They belong
 * to ONE signed-in athlete, so they must be dropped whenever the session changes. Otherwise a
 * second account on the same phone would see the first account's just-published activities.
 */
export function resetSessionOverlays() {
  resetPublishedForTests();
  resetRemovedForTests();
  resetActivityEditsForTests();
}
