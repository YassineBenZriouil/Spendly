import { createId } from '@/utils/ids';

import type { Expense, PaymentMethod } from './expense.types';

/** Optional context. `occurredAt` missing means "now" (stamped at save time). */
export type ExpenseDetails = Partial<Pick<Expense, 'title' | 'note' | 'occurredAt' | 'paymentMethod'>>;

export type NewExpense = Pick<Expense, 'amountMinor' | 'currencyCode' | 'categoryId'> & ExpenseDetails;

export const PaymentMethods: PaymentMethod[] = ['cash', 'card', 'transfer', 'other'];

export function validateNewExpense({ amountMinor, currencyCode, categoryId, occurredAt }: NewExpense): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 'Amount must be a positive whole number of minor units';
  if (!/^[A-Z]{3}$/.test(currencyCode)) return 'Currency must be an ISO 4217 code';
  if (!categoryId) return 'Category is required';
  if (occurredAt !== undefined && Number.isNaN(Date.parse(occurredAt))) return 'Date is invalid';
  return null;
}

/** Trims text and drops empty optional fields, so records never hold meaningless "" values. */
function withCleanDetails(expense: Expense): Expense {
  const { title, note, paymentMethod, ...rest } = expense;
  const cleanTitle = title?.trim();
  const cleanNote = note?.trim();
  return {
    ...rest,
    ...(cleanTitle ? { title: cleanTitle } : {}),
    ...(cleanNote ? { note: cleanNote } : {}),
    ...(paymentMethod && PaymentMethods.includes(paymentMethod) ? { paymentMethod } : {}),
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
>;

/** Applies edits to a stored expense. Currency is never changed: history keeps its own currency. */
export function updateExpense(existing: Expense, changes: ExpenseChanges, now = new Date()): Expense {
  const next: Expense = { ...existing, ...changes, updatedAt: now.toISOString() };
  const error = validateNewExpense(next);
  if (error) throw new Error(error);
  return withCleanDetails({ ...next, occurredAt: new Date(next.occurredAt).toISOString() });
}
