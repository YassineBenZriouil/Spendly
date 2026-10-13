import Storage from 'expo-sqlite/kv-store';

import type { QuickAddDraft } from './quickAddReducer';

const KEY = 'quickAdd.draft';

/** Unsaved composer state, kept apart from the ledger so a half-entered expense survives the app being killed. */
export function loadDraft(): QuickAddDraft | null {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    return isDraft(draft) ? draft : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: QuickAddDraft) {
  try {
    if (draft.categoryId === null && draft.amountMinor === 0) Storage.removeItemSync(KEY);
    else Storage.setItemSync(KEY, JSON.stringify(draft));
  } catch {
    // Draft recovery is best effort; never block entry because of it
  }
}

function isDraft(value: unknown): value is QuickAddDraft {
  if (!value || typeof value !== 'object') return false;
  const { categoryId, amountMinor } = value as Record<string, unknown>;
  return (
    (categoryId === null || typeof categoryId === 'string') &&
    typeof amountMinor === 'number' &&
    Number.isInteger(amountMinor) &&
    amountMinor >= 0
  );
}
