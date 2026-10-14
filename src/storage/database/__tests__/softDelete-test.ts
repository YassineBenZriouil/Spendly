import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { createSqliteInsightsRepository } from '@/domain/insights/insights.repository';

import { DELETED_RETENTION_DAYS, isDatabaseHealthy, purgeDeleted } from '../maintenance';
import { migrate } from '../migrations';
import { createTestDatabase } from '../testing/createTestDatabase';

jest.mock('expo-sqlite', () => ({}));

const DAY = { start: '2026-10-13T00:00:00.000Z', end: '2026-10-14T00:00:00.000Z' };

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const database = async () => db;
  return { db, expenses: createSqliteExpenseRepository(database), insights: createSqliteInsightsRepository(database) };
}

const lunch = () =>
  createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food', title: 'Lunch' }, new Date('2026-10-13T12:00:00.000Z'));

describe('soft delete', () => {
  it('hides a deleted expense from every read, Insights included', async () => {
    const { expenses, insights } = await setup();
    const expense = lunch();
    await expenses.save(expense);
    await expenses.save(createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-12T12:00:00.000Z')));
    await expenses.save(createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-11T12:00:00.000Z')));
    await expenses.remove(expense.id);

    expect(await expenses.get(expense.id)).toBeNull();
    expect(await expenses.listBetween(DAY)).toEqual([]);
    expect(await expenses.search({ text: 'Lunch' })).toEqual([]);
    expect(await expenses.totalsBetween(DAY)).toEqual([]);
    expect(await expenses.amountSuggestions('food', 'EUR', '2026-01-01T00:00:00.000Z')).toEqual([]);
    expect(await expenses.categoryTimes('2026-10-13T00:00:00.000Z')).toEqual([]);
    expect(await insights.totalsByCurrency(DAY)).toEqual([]);
    expect(await insights.byCategory(DAY, 'EUR')).toEqual([]);
    expect(await insights.daily([DAY], 'EUR')).toEqual([0]);
    expect(await insights.firstExpenseAt()).toBe('2026-10-11T12:00:00.000Z');
  });

  it('restores the expense exactly as it was, and an edit cannot touch a deleted one', async () => {
    const { expenses } = await setup();
    const expense = lunch();
    await expenses.save(expense);
    await expenses.remove(expense.id);
    await expect(expenses.update({ ...expense, amountMinor: 1 })).rejects.toThrow('not found');
    await expenses.restore(expense.id);
    expect(await expenses.get(expense.id)).toEqual(expense);
  });

  it(`purges only expenses deleted more than ${DELETED_RETENTION_DAYS} days ago`, async () => {
    const { db, expenses } = await setup();
    const old = lunch();
    const recent = createExpense({ amountMinor: 900, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T13:00:00.000Z'));
    const live = createExpense({ amountMinor: 500, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T14:00:00.000Z'));
    for (const expense of [old, recent, live]) await expenses.save(expense);
    await db.runAsync('UPDATE expenses SET deleted_at = ? WHERE id = ?', ['2026-09-01T00:00:00.000Z', old.id]);
    await db.runAsync('UPDATE expenses SET deleted_at = ? WHERE id = ?', ['2026-10-10T00:00:00.000Z', recent.id]);

    expect(await purgeDeleted(db, new Date('2026-10-14T00:00:00.000Z'))).toBe(1);
    const left = await db.getAllAsync<{ id: string }>('SELECT id FROM expenses ORDER BY amount_minor', []);
    expect(left.map((row) => row.id).sort()).toEqual([recent.id, live.id].sort());
  });
});

describe('isDatabaseHealthy', () => {
  it('is true for a sound database', async () => {
    const { db } = await setup();
    expect(await isDatabaseHealthy(db)).toBe(true);
  });

  it('is false when SQLite reports problems', async () => {
    const damaged = { getAllAsync: async () => [{ quick_check: 'row 3 missing from index expenses_occurred_at' }] };
    expect(await isDatabaseHealthy(damaged as never)).toBe(false);
  });
});
