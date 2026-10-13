import { createId } from '@/utils/ids';

import type { Expense } from './expense.types';

export type NewExpense = Pick<Expense, 'amountMinor' | 'currencyCode' | 'categoryId'>;

export function validateNewExpense({ amountMinor, currencyCode, categoryId }: NewExpense): string | null {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) return 'Amount must be a positive whole number of minor units';
  if (!/^[A-Z]{3}$/.test(currencyCode)) return 'Currency must be an ISO 4217 code';
  if (!categoryId) return 'Category is required';
  return null;
}

export function createExpense(input: NewExpense, now = new Date()): Expense {
  const error = validateNewExpense(input);
  if (error) throw new Error(error);
  const timestamp = now.toISOString();
  return {
    id: createId(),
    ...input,
    occurredAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
