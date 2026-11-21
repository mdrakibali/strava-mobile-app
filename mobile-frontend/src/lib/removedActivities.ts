/** Activities deleted in this session. A feed or profile response that started earlier must not put them back. */
const removed = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

export const subscribeRemovedActivities = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const removedActivityVersion = () => version;

export const resetRemovedForTests = () => {
  removed.clear();
};

export const markActivityRemoved = (id: string) => {
  if (removed.has(id)) return;
  removed.add(id);
  version++;
  listeners.forEach((l) => l());
};

export const withoutRemoved = <T extends { id: string }>(items: T[]): T[] => items.filter((item) => !removed.has(item.id));
