import type { Expense } from '@/domain/expense/expense.types';

export const Frequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type Frequency = (typeof Frequencies)[number];

/** What each occurrence is created from: copied from the expense the rule started with. */
export type RecurrenceTemplate = Pick<Expense, 'amountMinor' | 'currencyCode' | 'categoryId' | 'title' | 'note' | 'paymentMethod' | 'kind'>;

/**
 * A repeating expense. Occurrence 0 is the expense it started from; occurrences 1, 2, … are due at
 * `occurrenceDate(anchorAt, frequency, n)` and are only ever saved when the user confirms them.
 */
export type Recurrence = {
  id: string;
  sourceExpenseId: string;
  frequency: Frequency;
  /** The source expense's date and time: every occurrence keeps its day of month and time of day. */
  anchorAt: string;
  template: RecurrenceTemplate;
  /** False once the user stops repeating: no more occurrences become due. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** A due occurrence waiting for Confirm or Skip. */
export type Occurrence = {
  recurrenceId: string;
  /** 1, 2, … (0 is the source expense). */
  index: number;
  dueAt: string;
  frequency: Frequency;
  template: RecurrenceTemplate;
};

export type OccurrenceOutcome = 'confirmed' | 'skipped';

/** A handled occurrence: confirmed (with the expense it created) or skipped. */
export type HandledOccurrence = {
  recurrenceId: string;
  index: number;
  outcome: OccurrenceOutcome;
  expenseId: string | null;
  handledAt: string;
};
