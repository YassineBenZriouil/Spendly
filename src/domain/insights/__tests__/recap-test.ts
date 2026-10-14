import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { createSqliteInsightsRepository } from '../insights.repository';
import { loadInsights } from '../insights.service';
import { buildRecap, monthKey } from '../recap';

jest.mock('expo-sqlite', () => ({}));

// TZ=America/New_York. DST starts Sunday March 8, 2026 (2:00 → 3:00).
const MONDAY = 2;
const at = (month: number, day: number, hour = 12) => new Date(2026, month, day, hour).toISOString();

async function recapOf(month: number, now: Date, expenses: [iso: string, amountMinor: number, categoryId: string][]) {
  const db = createTestDatabase();
  await migrate(db);
  await createSqliteExpenseRepository(async () => db).saveMany(
    expenses.map(([occurredAt, amountMinor, categoryId]) => createExpense({ amountMinor, categoryId, currencyCode: 'EUR', occurredAt })),
  );
  const offset = month - now.getMonth();
  const insights = await loadInsights(createSqliteInsightsRepository(async () => db), {
    kind: 'month',
    offset,
    preferredCurrency: 'EUR',
    firstWeekday: MONDAY,
    now,
  });
  return buildRecap(insights);
}

describe('buildRecap', () => {
  const april2 = new Date(2026, 3, 2, 9);

  it('matches hand-calculated numbers for a month with a DST change and days without spending', async () => {
    const recap = await recapOf(2, april2, [
      // March: 3 days with spending, the rest nothing
      [at(2, 1), 2000, 'food'],
      // 00:30 on the night of the DST change, and 23:30 that same local day: both March 8
      [new Date(2026, 2, 8, 0, 30).toISOString(), 1500, 'transport'],
      [new Date(2026, 2, 8, 23, 30).toISOString(), 5000, 'transport'],
      [at(2, 31, 23), 1000, 'food'],
      // Outside March: never counted
      [new Date(2026, 1, 28, 23, 59).toISOString(), 99999, 'food'],
      [new Date(2026, 3, 1, 0, 0).toISOString(), 99999, 'food'],
    ]);
    expect(recap).not.toBeNull();
    expect(monthKey(recap!.month)).toBe('2026-03');
    expect(recap!.totalMinor).toBe(9500);
    expect(recap!.count).toBe(4);
    expect(recap!.topCategory).toEqual({ categoryId: 'transport', totalMinor: 6500, count: 2 });
    expect(recap!.biggestDay.totalMinor).toBe(6500);
    expect(recap!.biggestDay.day.getDate()).toBe(8);
    // Tracking began in February's last minute: not enough earlier months to know what's usual
    expect(recap!.change).toBeNull();
  });

  it('compares with a usual month once there are 4 earlier ones', async () => {
    const usualMonths = [9, 10, 11].map((month): [string, number, string] => [new Date(2025, month, 10, 12).toISOString(), 10000, 'food']);
    const recap = await recapOf(2, april2, [
      [new Date(2025, 8, 1, 12).toISOString(), 10000, 'food'],
      ...usualMonths,
      [at(0, 10), 10000, 'food'],
      [at(1, 10), 10000, 'food'],
      [at(2, 10), 15000, 'food'],
    ]);
    expect(recap!.change).toEqual({ direction: 'up', percent: 50 });
  });

  it('says nothing about a month without spending, or the month still running', async () => {
    expect(await recapOf(2, april2, [[at(1, 10), 1000, 'food']])).toBeNull();
    expect(await recapOf(3, april2, [[at(3, 1), 1000, 'food']])).toBeNull();
  });
});
