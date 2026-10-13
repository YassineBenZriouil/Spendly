import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import type { Expense } from '@/domain/expense/expense.types';
import { startOfLocalDay } from '@/utils/dates';

type DayItem = { type: 'day'; key: string; day: Date; totals: CurrencyTotal[] };

export type ActivityItem = DayItem | { type: 'expense'; key: string; expense: Expense };

/** Flattens newest-first expenses into local-day headers (with per-currency totals) followed by their rows. */
export function groupByDay(expenses: Expense[]): ActivityItem[] {
  const items: ActivityItem[] = [];
  let header = null as DayItem | null;

  for (const expense of expenses) {
    const day = startOfLocalDay(new Date(expense.occurredAt));
    const key = day.toISOString();
    if (header?.key !== key) {
      header = { type: 'day', key, day, totals: [] };
      items.push(header);
    }
    const total = header.totals.find((t) => t.currencyCode === expense.currencyCode);
    if (total) total.totalMinor += expense.amountMinor;
    else header.totals.push({ currencyCode: expense.currencyCode, totalMinor: expense.amountMinor });
    items.push({ type: 'expense', key: expense.id, expense });
  }
  return items;
}
