import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import type { Expense } from '@/domain/expense/expense.types';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';
import { startOfLocalDay } from '@/utils/dates';

type DayItem = { type: 'day'; key: string; day: Date; totals: CurrencyTotal[] };

export type ActivityItem =
  | DayItem
  | { type: 'expense'; key: string; expense: Expense }
  /** A repeating expense waiting for Confirm or Skip: shown on its day, never counted in totals. */
  | { type: 'pending'; key: string; occurrence: Occurrence };

type Entry = { at: string; day: Date; pending: boolean; order: number; item: ActivityItem };

/**
 * Flattens newest-first expenses (and due occurrences) into local-day headers, with per-currency totals of the
 * expenses only, followed by their rows. On each day, pending occurrences come first.
 */
export function groupByDay(expenses: Expense[], pending: Occurrence[] = []): ActivityItem[] {
  const entries: Entry[] = [
    ...expenses.map((expense, order) => ({
      at: expense.occurredAt,
      day: startOfLocalDay(new Date(expense.occurredAt)),
      pending: false,
      order,
      item: { type: 'expense' as const, key: expense.id, expense },
    })),
    ...pending.map((occurrence, order) => ({
      at: occurrence.dueAt,
      day: startOfLocalDay(new Date(occurrence.dueAt)),
      pending: true,
      order,
      item: { type: 'pending' as const, key: `pending:${occurrence.recurrenceId}:${occurrence.index}`, occurrence },
    })),
  ];
  // Newest day first; pending first within a day; then newest first (ties keep the given order)
  entries.sort(
    (a, b) =>
      b.day.getTime() - a.day.getTime() ||
      Number(b.pending) - Number(a.pending) ||
      b.at.localeCompare(a.at) ||
      a.order - b.order,
  );

  const items: ActivityItem[] = [];
  let header = null as DayItem | null;
  for (const entry of entries) {
    const key = entry.day.toISOString();
    if (header?.key !== key) {
      header = { type: 'day', key, day: entry.day, totals: [] };
      items.push(header);
    }
    if (entry.item.type === 'expense') {
      const { expense } = entry.item;
      const total = header.totals.find((t) => t.currencyCode === expense.currencyCode);
      if (total) total.totalMinor += expense.amountMinor;
      else header.totals.push({ currencyCode: expense.currencyCode, totalMinor: expense.amountMinor });
    }
    items.push(entry.item);
  }
  return items;
}
