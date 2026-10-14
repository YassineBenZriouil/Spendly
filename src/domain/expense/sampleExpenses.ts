import { BuiltInCategories } from '@/domain/category/builtInCategories';

import { createExpense } from './expense.service';
import type { Expense } from './expense.types';

const SPREAD_DAYS = 3 * 365;
const TITLES = ['Coffee', 'Lunch', 'Taxi', 'Supermarket', 'Pharmacy', 'Cinema', 'Electricity', 'Books', undefined];

/** Dev-only bulk data for checking that the app stays smooth with long histories. Spread over the last 3 years. */
export function sampleExpenses(count: number, currencyCode: string, now = new Date()): Expense[] {
  return Array.from({ length: count }, (_, i) => {
    const occurredAt = new Date(now.getTime() - Math.random() * SPREAD_DAYS * 86_400_000).toISOString();
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
