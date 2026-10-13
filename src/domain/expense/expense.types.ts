export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other';

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
  createdAt: string;
  updatedAt: string;
};
