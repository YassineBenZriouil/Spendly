export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

/** Money out (the default) or money in. Spending totals, Insights and budgets only ever count expenses. */
export type EntryKind = 'expense' | 'income';

export type Expense = {
  id: string;
  /** Integer in the currency's minor unit. Never a float. */
  amountMinor: number;
  /** ISO 4217, e.g. "MAD", "EUR", "USD". */
  currencyCode: string;
  categoryId: string;
  title?: string;
  note?: string;
  /** ISO 8601 */
  occurredAt: string;
  paymentMethod?: PaymentMethod;
  /** Only present for income; absent means an expense. */
  kind?: 'income';
  createdAt: string;
  updatedAt: string;
};
