import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { buildHighlights } from '../highlights';
import { createSqliteInsightsRepository } from '../insights.repository';
import { baselineWindows, loadInsights, notableMinimumMinor } from '../insights.service';
import { periodFor } from '../period';

jest.mock('expo-sqlite', () => ({}));

// TZ=America/New_York. Weeks start Monday. DST ends Sunday Nov 1, 2026.
const MONDAY = 2;
/** Wednesday Nov 11 2026, noon local (EST): 3 days of this week have passed. */
const now = new Date(2026, 10, 11, 12);
const local = (month: number, day: number, hour = 8) => new Date(2026, month, day, hour).toISOString();

async function setup(expenses: [iso: string, amountMinor: number, categoryId: string][]) {
  const db = createTestDatabase();
  await migrate(db);
  await createSqliteExpenseRepository(async () => db).saveMany(
    expenses.map(([occurredAt, amountMinor, categoryId]) => createExpense({ amountMinor, categoryId, currencyCode: 'EUR', occurredAt })),
  );
  return createSqliteInsightsRepository(async () => db);
}

/** Monday of each of the 9 weeks before the current one (Sep 7 … Nov 2), oldest first. */
const earlierMondays = Array.from({ length: 9 }, (_, i) => [8, 7 + 7 * i] as const).map(([month, day]) => new Date(2026, month, day));

describe('baseline', () => {
  it('cuts every earlier week to the days this one has had, across the DST change', () => {
    const period = periodFor('week', 0, now, MONDAY);
    const windows = baselineWindows(period, now, MONDAY, new Date(2026, 0, 1));
    expect(windows).toHaveLength(8);
    // Most recent: Mon Nov 2 (after DST, EST) to Thu Nov 5, 00:00 local
    expect(windows[0]).toEqual({ start: '2026-11-02T05:00:00.000Z', end: '2026-11-05T05:00:00.000Z' });
    // Mon Oct 26 (before DST, EDT) to Thu Oct 29
    expect(windows[1]).toEqual({ start: '2026-10-26T04:00:00.000Z', end: '2026-10-29T04:00:00.000Z' });
  });

  it('leaves out periods from before tracking started', () => {
    const period = periodFor('week', 0, now, MONDAY);
    // First expense on Wednesday Oct 21: the week of Oct 19 was only half tracked
    expect(baselineWindows(period, now, MONDAY, new Date(2026, 9, 21))).toHaveLength(2);
    expect(baselineWindows(period, now, MONDAY, null)).toEqual([]);
  });

  it('matches hand-calculated numbers on seeded data', async () => {
    const repository = await setup([
      // Each earlier week: 100 € food on Monday (inside the Mon–Wed window) and 500 € on Thursday (outside it)
      ...earlierMondays.flatMap((monday): [string, number, string][] => [
        [local(monday.getMonth(), monday.getDate()), 10000, 'food'],
        [local(monday.getMonth(), monday.getDate() + 3), 50000, 'food'],
      ]),
      // This week so far: 150 € food on Monday, Tuesday 00:30 right after midnight
      [local(10, 9), 10000, 'food'],
      [new Date(2026, 10, 10, 0, 30).toISOString(), 5000, 'food'],
    ]);
    const insights = await loadInsights(repository, { kind: 'week', offset: 0, preferredCurrency: 'EUR', firstWeekday: MONDAY, now });

    expect(insights.baseline).toHaveLength(8);
    expect(insights.baseline.every((week) => week.totalMinor === 10000)).toBe(true);
    expect(insights.totalMinor).toBe(15000);
    expect(insights.minimumMinor).toBe(notableMinimumMinor('EUR'));

    const highlights = buildHighlights({
      kind: 'week',
      currencyCode: insights.currencyCode,
      isCurrent: insights.isCurrent,
      current: { totalMinor: insights.totalMinor, byCategory: insights.byCategory },
      baseline: insights.baseline,
      days: insights.days,
      minimumMinor: insights.minimumMinor,
      categoryName: () => 'Food',
      dayName: () => 'Mon',
    });
    // 150 € vs a usual 100 € by Wednesday: +50%
    expect(highlights.map((highlight) => highlight.text)).toEqual([
      "You've spent 50% more than in a usual week",
      'Food is up 50% compared with your usual week',
      'Biggest day: Mon, €100.00',
    ]);
  });

  it('uses a currency-aware minimum', () => {
    expect(notableMinimumMinor('EUR')).toBe(1000);
    expect(notableMinimumMinor('KWD')).toBe(10000);
    expect(notableMinimumMinor('JPY')).toBe(1000);
  });
});
