import { createId } from '@/utils/ids';

import type { EntryKind, Expense, PaymentMethod } from './expense.types';

/** Optional context. `occurredAt` missing means "now" (stamped at save time). */
export type ExpenseDetails = Partial<Pick<Expense, 'title' | 'note' | 'occurredAt' | 'paymentMethod'>>;

export type NewExpense = Pick<Expense, 'amountMinor' | 'currencyCode' | 'categoryId'> & ExpenseDetails & { kind?: EntryKind };

export const PaymentMethods: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];

export function validateNewExpense({ amountMinor, currencyCode, categoryId, occurredAt }: NewExpense): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 'Amount must be a positive whole number of minor units';
  if (!/^[A-Z]{3}$/.test(currencyCode)) return 'Currency must be an ISO 4217 code';
  if (!categoryId) return 'Category is required';
  if (occurredAt !== undefined && Number.isNaN(Date.parse(occurredAt))) return 'Date is invalid';
  return null;
}

/** An expense as typed or edited, before cleanup (it may still say `kind: 'expense'`). */
type DraftEntry = Omit<Expense, 'kind'> & { kind?: EntryKind };

/** Trims text and drops empty optional fields (and the default kind), so records never hold meaningless values. */
function withCleanDetails(expense: DraftEntry): Expense {
  const { title, note, paymentMethod, kind, ...rest } = expense;
  const cleanTitle = title?.trim();
  const cleanNote = note?.trim();
  return {
    ...rest,
    ...(cleanTitle ? { title: cleanTitle } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
    ...(paymentMethod && PaymentMethods.includes(paymentMethod) ? { paymentMethod } : {}),
    ...(kind === 'income' ? { kind } : {}),
  };
}

/** `id` can be chosen up front so a save interrupted by the app being killed can be recognised later. */
export function createExpense(input: NewExpense, now = new Date(), id = createId()): Expense {
  const error = validateNewExpense(input);
  if (error) throw new Error(error);
  const timestamp = now.toISOString();
  return withCleanDetails({
    id,
    ...input,
    occurredAt: input.occurredAt ? new Date(input.occurredAt).toISOString() : timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export type ExpenseChanges = Partial<
  Pick<Expense, 'amountMinor' | 'categoryId' | 'title' | 'note' | 'occurredAt' | 'paymentMethod'>
> & { kind?: EntryKind };

/** Applies edits to a stored expense. Currency is never changed: history keeps its own currency. */
export function updateExpense(existing: Expense, changes: ExpenseChanges, now = new Date()): Expense {
  const next: DraftEntry = { ...existing, ...changes, updatedAt: now.toISOString() };
  const error = validateNewExpense(next);
  if (error) throw new Error(error);
  return withCleanDetails({ ...next, occurredAt: new Date(next.occurredAt).toISOString() });
}

/** "Again": a new entry with the same category, amount, title, currency and kind, dated now. */
export function againFrom(expense: Expense, now = new Date()): Expense {
  const { amountMinor, currencyCode, categoryId, title, kind } = expense;
  return createExpense({ amountMinor, currencyCode, categoryId, kind, ...(title ? { title } : {}) }, now);
}
