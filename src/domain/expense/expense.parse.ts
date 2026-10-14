import { isPhotoName } from '@/domain/photo/photo';

import { PaymentMethods } from './expense.service';
import type { Expense, PaymentMethod } from './expense.types';

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isOptionalText = (value: unknown) => value === undefined || typeof value === 'string';

/**
 * An `Expense` read back from outside the database (a backup file, stored undo state), or `null` if anything about it
 * is wrong. Never trusts the shape: every field is checked, and only known fields are kept.
 */
export function parseExpense(value: unknown): Expense | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const valid =
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.amountMinor === 'number' &&
    Number.isSafeInteger(v.amountMinor) &&
    v.amountMinor > 0 &&
    typeof v.currencyCode === 'string' &&
    /^[A-Z]{3}$/.test(v.currencyCode) &&
    typeof v.categoryId === 'string' &&
    v.categoryId.length > 0 &&
    isOptionalText(v.title) &&
    isOptionalText(v.note) &&
    (v.paymentMethod === undefined || PaymentMethods.includes(v.paymentMethod as PaymentMethod)) &&
    (v.kind === undefined || v.kind === 'expense' || v.kind === 'income') &&
    (v.photo === undefined || isPhotoName(v.photo)) &&
    isIsoDate(v.occurredAt) &&
    isIsoDate(v.createdAt) &&
    isIsoDate(v.updatedAt);
  if (!valid) return null;
  return {
    id: v.id as string,
    amountMinor: v.amountMinor as number,
    currencyCode: v.currencyCode as string,
    categoryId: v.categoryId as string,
    ...(v.title ? { title: v.title as string } : {}),
    ...(v.note ? { note: v.note as string } : {}),
    ...(v.paymentMethod ? { paymentMethod: v.paymentMethod as PaymentMethod } : {}),
    ...(v.kind === 'income' ? { kind: 'income' as const } : {}),
    ...(v.photo ? { photo: v.photo as string } : {}),
    occurredAt: v.occurredAt as string,
    createdAt: v.createdAt as string,
    updatedAt: v.updatedAt as string,
  };
}
