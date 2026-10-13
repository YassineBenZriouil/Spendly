import Storage from 'expo-sqlite/kv-store';

import { PaymentMethods } from '@/domain/expense/expense.service';
import type { PaymentMethod } from '@/domain/expense/expense.types';

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
    if (isEmpty(draft)) Storage.removeItemSync(KEY);
    else Storage.setItemSync(KEY, JSON.stringify(draft));
  } catch {
    // Draft recovery is best effort; never block entry because of it
  }
}

function isEmpty({ categoryId, amountMinor, details = {} }: QuickAddDraft) {
  return categoryId === null && amountMinor === 0 && Object.values(details).every((value) => !value);
}

const optionalString = (value: unknown) => value === undefined || typeof value === 'string';

function isDraft(value: unknown): value is QuickAddDraft {
  if (!value || typeof value !== 'object') return false;
  const { categoryId, amountMinor, details } = value as Record<string, unknown>;
  return (
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
