import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { createSqliteInsightsRepository } from '../insights.repository';
import { loadInsights } from '../insights.service';
import { comparisonRange, periodFor } from '../period';

jest.mock('expo-sqlite', () => ({}));

// TZ=America/New_York (jest.global-setup.js). Weeks start Monday (firstWeekday 2) unless stated.
const MONDAY = 2;
const SUNDAY = 1;
// Wednesday Oct 14 2026, 12:00 local
const now = new Date('2026-10-14T16:00:00.000Z');

async function setup(expenses: [iso: string, amountMinor: number, categoryId: string, currencyCode?: string][]) {
  const db = createTestDatabase();
  await migrate(db);
  await createSqliteExpenseRepository(async () => db).saveMany(
    expenses.map(([occurredAt, amountMinor, categoryId, currencyCode = 'EUR']) =>
      createExpense({ amountMinor, categoryId, currencyCode, occurredAt }),
    ),
  );
  return createSqliteInsightsRepository(async () => db);
}

describe('periods', () => {
  it('starts weeks on the locale first weekday, at local midnight', () => {
    expect(periodFor('week', 0, now, MONDAY).start.toISOString()).toBe('2026-10-12T04:00:00.000Z'); // Mon Oct 12
    expect(periodFor('week', 0, now, SUNDAY).start.toISOString()).toBe('2026-10-11T04:00:00.000Z'); // Sun Oct 11
    expect(periodFor('week', 0, now, MONDAY).days).toHaveLength(7);
  });

  it('handles months and the DST change inside them', () => {
    const november = periodFor('month', 1, now, MONDAY);
    expect(november.days).toHaveLength(30);
    expect(november.start.toISOString()).toBe('2026-11-01T04:00:00.000Z'); // EDT
    expect(november.end.toISOString()).toBe('2026-12-01T05:00:00.000Z'); // EST
    expect(periodFor('month', -1, now, MONDAY).days).toHaveLength(30); // September
  });

  it('compares with the same number of days of the previous period', () => {
    // Mon–Wed this week -> Mon–Wed last week
    expect(comparisonRange(periodFor('week', 0, now, MONDAY), now, MONDAY)).toEqual({
      start: '2026-10-05T04:00:00.000Z',
      end: '2026-10-08T04:00:00.000Z',
    });
    // A finished week compares with the whole week before it
    expect(comparisonRange(periodFor('week', -1, now, MONDAY), now, MONDAY).end).toBe('2026-10-05T04:00:00.000Z');
    // Oct 1–14 -> Sep 1–14
    expect(comparisonRange(periodFor('month', 0, now, MONDAY), now, MONDAY).end).toBe('2026-09-15T04:00:00.000Z');
  });
});

describe('loadInsights', () => {
  it('matches hand-calculated totals for the current week', async () => {
    const repository = await setup([
      ['2026-10-04T15:00:00.000Z', 999, 'food'], // Sun Oct 4: before last week's comparison window
      ['2026-10-05T15:00:00.000Z', 500, 'food'], // Mon Oct 5 (last week, counted)
      ['2026-10-07T15:00:00.000Z', 700, 'transport'], // Wed Oct 7 (last week, counted)
      ['2026-10-08T15:00:00.000Z', 4000, 'bills'], // Thu Oct 8 (last week, after "same days")
      ['2026-10-12T04:00:00.000Z', 1000, 'food'], // Mon Oct 12 00:00 local
      ['2026-10-12T20:00:00.000Z', 250, 'food'], // Mon Oct 12
      ['2026-10-14T15:00:00.000Z', 3000, 'groceries'], // Wed Oct 14
      ['2026-10-14T15:30:00.000Z', 1200, 'food', 'USD'], // other currency: never added in
      ['2026-10-12T03:59:00.000Z', 8888, 'travel'], // Sun Oct 11 23:59 local: last week
    ]);

    const insights = await loadInsights(repository, {
      kind: 'week',
      offset: 0,
      preferredCurrency: 'EUR',
      firstWeekday: MONDAY,
      now,
    });

    expect(insights.currencies).toEqual(['EUR', 'USD']);
    expect(insights.totalMinor).toBe(1000 + 250 + 3000);
    expect(insights.count).toBe(3);
    expect(insights.previousTotalMinor).toBe(500 + 700);
    expect(insights.byCategory).toEqual([
      { categoryId: 'groceries', totalMinor: 3000, count: 1 },
      { categoryId: 'food', totalMinor: 1250, count: 2 },
    ]);
    expect(insights.days.map((d) => d.totalMinor)).toEqual([1250, 0, 3000, 0, 0, 0, 0]);
    // Thu–Sun haven't happened yet: no data, not zero
    expect(insights.days.map((d) => d.state)).toEqual(['spent', 'zero', 'spent', 'noData', 'noData', 'noData', 'noData']);
  });

  it('shows another currency on request and falls back to the largest one', async () => {
    const repository = await setup([
      ['2026-10-13T15:00:00.000Z', 1200, 'food', 'USD'],
      ['2026-10-13T16:00:00.000Z', 300, 'food', 'EUR'],
    ]);
    const base = { kind: 'week' as const, offset: 0, firstWeekday: MONDAY, now };
    expect((await loadInsights(repository, { ...base, preferredCurrency: 'EUR' })).totalMinor).toBe(300);
    expect((await loadInsights(repository, { ...base, preferredCurrency: 'GBP' })).currencyCode).toBe('USD');
  });

  it('tells zero spending apart from no data', async () => {
    const empty = await loadInsights(await setup([]), {
      kind: 'week',
      offset: 0,
      preferredCurrency: 'EUR',
      firstWeekday: MONDAY,
      now,
    });
    expect(empty.hasAnyData).toBe(false);
    expect(empty.previousTotalMinor).toBeNull();
    expect(empty.days.every((d) => d.state === 'noData')).toBe(true);

    // Tracking started Tuesday: Monday is "no data", Tuesday spent, Wednesday "zero"
    const started = await loadInsights(await setup([['2026-10-13T15:00:00.000Z', 100, 'food']]), {
      kind: 'week',
      offset: 0,
      preferredCurrency: 'EUR',
      firstWeekday: MONDAY,
      now,
    });
    expect(started.days.slice(0, 3).map((d) => d.state)).toEqual(['noData', 'spent', 'zero']);
    expect(started.previousTotalMinor).toBeNull(); // nothing recorded back then
  });
});
