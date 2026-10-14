import { createSqliteInsightsRepository } from '@/domain/insights/insights.repository';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { parseExpense } from '../expense.parse';
import { createSqliteExpenseRepository } from '../expense.repository';
import { againFrom, createExpense, updateExpense } from '../expense.service';

jest.mock('expo-sqlite', () => ({}));

const DAY = { start: '2026-10-13T00:00:00.000Z', end: '2026-10-14T00:00:00.000Z' };
const at = '2026-10-13T12:00:00.000Z';

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const database = async () => db;
  return { expenses: createSqliteExpenseRepository(database), insights: createSqliteInsightsRepository(database) };
}

const lunch = createExpense({ amountMinor: 1500, currencyCode: 'EUR', categoryId: 'food', occurredAt: at }, new Date(at));
const salary = createExpense({ amountMinor: 250000, currencyCode: 'EUR', categoryId: 'other', kind: 'income', occurredAt: at }, new Date(at));

describe('income', () => {
  it('is an entry kind: stored as income, expenses carry no kind', () => {
    expect(salary.kind).toBe('income');
    expect(lunch).not.toHaveProperty('kind');
    expect(createExpense({ amountMinor: 1, currencyCode: 'EUR', categoryId: 'food', kind: 'expense' })).not.toHaveProperty('kind');
    expect(updateExpense(salary, { kind: 'expense' })).not.toHaveProperty('kind');
    expect(againFrom(salary).kind).toBe('income');
    expect(parseExpense(salary)?.kind).toBe('income');
    expect(parseExpense({ ...lunch, kind: 'gift' })).toBeNull();
  });

  it('shows in Activity but never counts as spending', async () => {
    const { expenses, insights } = await setup();
    await expenses.save(lunch);
    await expenses.save(salary);

    expect(await expenses.get(salary.id)).toEqual(salary);
    expect((await expenses.search({})).map((entry) => entry.id).sort()).toEqual([lunch.id, salary.id].sort());
    expect(await expenses.totalsBetween(DAY)).toEqual([{ currencyCode: 'EUR', totalMinor: 1500 }]);
    expect(await expenses.categoryTimes('2026-10-01T00:00:00.000Z')).toEqual([{ categoryId: 'food', occurredAt: at }]);
    expect(await insights.totalsByCurrency(DAY)).toEqual([{ currencyCode: 'EUR', totalMinor: 1500, count: 1 }]);
    expect(await insights.byCategory(DAY, 'EUR')).toEqual([{ categoryId: 'food', totalMinor: 1500, count: 1 }]);
    expect(await insights.daily([DAY], 'EUR')).toEqual([1500]);
    expect(await insights.incomeTotal(DAY, 'EUR')).toBe(250000);
    expect(await insights.incomeTotal(DAY, 'USD')).toBe(0);
  });

  it('switching kind on edit moves it between income and spending', async () => {
    const { expenses } = await setup();
    await expenses.save(salary);
    await expenses.update(updateExpense(salary, { kind: 'expense' }));
    expect(await expenses.totalsBetween(DAY)).toEqual([{ currencyCode: 'EUR', totalMinor: 250000 }]);
  });
});
