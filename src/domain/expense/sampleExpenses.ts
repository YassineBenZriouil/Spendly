import { BuiltInCategories } from '@/domain/category/builtInCategories';

import { createExpense } from './expense.service';
import type { Expense } from './expense.types';

const TITLES = ['Coffee', 'Lunch', 'Taxi', 'Supermarket', 'Pharmacy', 'Cinema', 'Electricity', 'Books', undefined];

/** Dev-only bulk data for checking that Activity stays smooth with long histories. Spread over the last 180 days. */
export function sampleExpenses(count: number, currencyCode: string, now = new Date()): Expense[] {
  return Array.from({ length: count }, (_, i) => {
    const occurredAt = new Date(now.getTime() - Math.random() * 180 * 86_400_000).toISOString();
    return createExpense(
      {
        amountMinor: 100 + Math.floor(Math.random() * 9900),
        currencyCode,
        categoryId: BuiltInCategories[i % BuiltInCategories.length].id,
        title: TITLES[i % TITLES.length],
        note: 'Sample data',
        occurredAt,
      },
      now,
    );
  });
}
