/**
 * The title, sport and visibility last saved on this device. A feed or detail response that
 * started before the save, or that still has the previous row, must not paint the old text
 * back over it. The overlay is dropped once a response matches what was saved.
 */
export interface ActivityEdit {
  title: string;
  description: string | null;
  sportType: string;
  visibility: string;
}

const edits = new Map<string, ActivityEdit>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const subscribeActivityEdits = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const activityEditVersion = () => version;

export function resetActivityEditsForTests() {
  edits.clear();
}

export function rememberActivityEdit(id: string, edit: ActivityEdit) {
  edits.set(id, edit);
  emit();
}

export function activityEditFor(id: string) {
  return edits.get(id);
}

const sameEdit = (item: ActivityEdit, edit: ActivityEdit) =>
  item.title === edit.title &&
  (item.description ?? null) === (edit.description ?? null) &&
  item.sportType === edit.sportType &&
  item.visibility === edit.visibility;

export function reconcileActivity<T extends { id: string } & Partial<ActivityEdit>>(item: T): T {
  const edit = edits.get(item.id);
  if (!edit) return item;
  if (
    item.title != null &&
    item.sportType != null &&
    item.visibility != null &&
    sameEdit(
      {
        title: item.title,
        description: item.description ?? null,
        sportType: item.sportType,
        visibility: item.visibility,
      },
      edit
    )
  ) {
    edits.delete(item.id);
    return item;
  }
  return { ...item, ...edit };
}
