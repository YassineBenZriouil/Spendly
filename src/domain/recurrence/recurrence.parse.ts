import { parseExpense } from '@/domain/expense/expense.parse';

import { Frequencies, type Frequency, type HandledOccurrence, type Recurrence } from './recurrence.types';

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** A rule read back from a backup file, or `null` if anything about it is wrong. */
export function parseRecurrence(value: unknown): Recurrence | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== 'string' ||
    !v.id ||
    typeof v.sourceExpenseId !== 'string' ||
    !Frequencies.includes(v.frequency as Frequency) ||
    !isIsoDate(v.anchorAt) ||
    typeof v.active !== 'boolean' ||
    !v.template ||
    typeof v.template !== 'object'
  ) {
    return null;
  }
  // The template has the same rules as an expense's fields
  const template = parseExpense({ ...(v.template as object), id: v.id, occurredAt: v.anchorAt, createdAt: v.createdAt, updatedAt: v.updatedAt });
  if (!template) return null;
  const { amountMinor, currencyCode, categoryId, title, note, paymentMethod, kind } = template;
  return {
    id: v.id,
    sourceExpenseId: v.sourceExpenseId,
    frequency: v.frequency as Frequency,
    anchorAt: v.anchorAt,
    template: {
      amountMinor,
      currencyCode,
      categoryId,
      ...(title ? { title } : {}),
      ...(note ? { note } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(kind ? { kind } : {}),
    },
    active: v.active,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/** A confirmed or skipped occurrence read back from a backup file, or `null`. */
export function parseHandledOccurrence(value: unknown): HandledOccurrence | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const valid =
    typeof v.recurrenceId === 'string' &&
    typeof v.index === 'number' &&
    Number.isInteger(v.index) &&
    v.index > 0 &&
    (v.outcome === 'confirmed' || v.outcome === 'skipped') &&
    (v.expenseId === null || typeof v.expenseId === 'string') &&
    isIsoDate(v.handledAt);
  if (!valid) return null;
  return {
    recurrenceId: v.recurrenceId as string,
    index: v.index as number,
    outcome: v.outcome as HandledOccurrence['outcome'],
    expenseId: v.expenseId as string | null,
    handledAt: v.handledAt as string,
  };
}
