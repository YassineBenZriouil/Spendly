import Storage from 'expo-sqlite/kv-store';

import { PaymentMethods } from '@/domain/expense/expense.service';
import type { PaymentMethod } from '@/domain/expense/expense.types';
import { Frequencies, type Frequency } from '@/domain/recurrence/recurrence.types';

import type { QuickAddDraft } from './quickAddReducer';

const KEY = 'quickAdd.draft';

/** Unsaved composer state, kept apart from the ledger so a half-entered expense survives the app being killed. */
export function loadDraft(): QuickAddDraft | null {
  try {
    const raw = Storage.getItemSync(KEY);
    if (!raw) return null;
    const stored: unknown = JSON.parse(raw);
    if (!isDraft(stored)) return null;
    // The pending-save marker is storage bookkeeping, not part of the draft
    const { categoryId, amountMinor, details, repeat } = stored;
    return { categoryId, amountMinor, ...(details ? { details } : {}), ...(repeat ? { repeat } : {}) };
  } catch {
    return null;
  }
}

/**
 * `pendingExpenseId`: the id a save in progress is writing under. If the app dies after the database write but
 * before the draft is cleared, the next launch finds that expense already stored and drops the stale draft
 * instead of offering it again (which would save a duplicate).
 */
export function saveDraft(draft: QuickAddDraft, pendingExpenseId?: string) {
  try {
    if (isEmpty(draft)) Storage.removeItemSync(KEY);
    else Storage.setItemSync(KEY, JSON.stringify({ ...draft, pendingExpenseId }));
  } catch {
    // Draft recovery is best effort; never block entry because of it
  }
}

/** Id of a save that was in progress when the draft was last written, if any. */
export function loadPendingExpenseId(): string | undefined {
  try {
    const raw = Storage.getItemSync(KEY);
    const pending: unknown = raw ? JSON.parse(raw)?.pendingExpenseId : undefined;
    return typeof pending === 'string' ? pending : undefined;
  } catch {
    return undefined;
  }
}

function isEmpty({ categoryId, amountMinor, details = {}, repeat }: QuickAddDraft) {
  return categoryId === null && amountMinor === 0 && !repeat && Object.values(details).every((value) => !value);
}

const optionalString = (value: unknown) => value === undefined || typeof value === 'string';

function isDraft(value: unknown): value is QuickAddDraft {
  if (!value || typeof value !== 'object') return false;
  const { categoryId, amountMinor, details, repeat } = value as Record<string, unknown>;
  return (
    (repeat === undefined || Frequencies.includes(repeat as Frequency)) &&
    (categoryId === null || typeof categoryId === 'string') &&
    typeof amountMinor === 'number' &&
    Number.isInteger(amountMinor) &&
    amountMinor >= 0 &&
    (details === undefined || isDetails(details))
  );
}

function isDetails(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  const { title, note, occurredAt, paymentMethod } = value as Record<string, unknown>;
  return (
    optionalString(title) &&
    optionalString(note) &&
    (occurredAt === undefined || (typeof occurredAt === 'string' && !Number.isNaN(Date.parse(occurredAt)))) &&
    (paymentMethod === undefined || PaymentMethods.includes(paymentMethod as PaymentMethod))
  );
}
