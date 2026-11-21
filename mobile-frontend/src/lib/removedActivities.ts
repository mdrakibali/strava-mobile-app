/** Activities deleted in this session. A feed or profile response that started earlier must not put them back. */
const removed = new Set<string>();

export const markActivityRemoved = (id: string) => {
  removed.add(id);
};

export const withoutRemoved = <T extends { id: string }>(items: T[]): T[] => items.filter((item) => !removed.has(item.id));
