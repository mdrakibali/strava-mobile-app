import { useSyncExternalStore } from 'react';
import { reconcileActivity, subscribeActivityEdits, activityEditVersion } from './activityEdits';
import { ActivityView } from './activityView';
import { removedActivityVersion, subscribeRemovedActivities, withoutRemoved } from './removedActivities';

/**
 * Activities this device has just published. Home, Profile and History show them at once,
 * and keep them if a feed response that does not contain them yet arrives afterwards.
 * Once that response includes the id, the server copy is the one on screen.
 */
const published = new Map<string, ActivityView>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const subscribePublishedActivities = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const publishedActivityVersion = () => version;

export function resetPublishedForTests() {
  published.clear();
}

export function rememberPublishedActivity(activity: ActivityView) {
  published.set(activity.id, activity);
  emit();
}

/** Server rows plus anything published here that those rows do not contain yet. Newest first. */
export function presentActivities(serverItems: ActivityView[]): ActivityView[] {
  const kept = withoutRemoved(serverItems).map(reconcileActivity);
  const seen = new Set(kept.map((item) => item.id));
  const extras = withoutRemoved([...published.values()].filter((item) => !seen.has(item.id))).map(reconcileActivity);
  return [...extras, ...kept].sort((a, b) => String(b.startTime).localeCompare(String(a.startTime)));
}

export function useActivityRevision() {
  const edits = useSyncExternalStore(subscribeActivityEdits, activityEditVersion);
  const removed = useSyncExternalStore(subscribeRemovedActivities, removedActivityVersion);
  const local = useSyncExternalStore(subscribePublishedActivities, publishedActivityVersion);
  return edits + removed + local;
}
