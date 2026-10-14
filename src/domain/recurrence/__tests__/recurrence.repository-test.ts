import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { createSqliteRecurrenceRepository } from '../recurrence.repository';

jest.mock('expo-sqlite', () => ({}));

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const database = async () => db;
  return { db, expenses: createSqliteExpenseRepository(database), recurrences: createSqliteRecurrenceRepository(database) };
}

// TZ=America/New_York
const local = (month: number, day: number, hours = 9) => new Date(2026, month - 1, day, hours);
const rent = () =>
  createExpense(
    { amountMinor: 450000, currencyCode: 'MAD', categoryId: 'home', title: 'Rent', occurredAt: local(7, 1).toISOString() },
    local(7, 1),
  );

describe('recurrence repository', () => {
  it('saves the expense and its rule together; due occurrences are pending, never saved', async () => {
    const { expenses, recurrences } = await setup();
    const source = rent();
    await recurrences.saveRepeating(source, 'monthly');

    expect(await expenses.get(source.id)).toEqual(source);
    const pending = await recurrences.pending(local(9, 15));
    expect(pending.map((occurrence) => [occurrence.index, occurrence.dueAt])).toEqual([
      [2, local(9, 1).toISOString()],
      [1, local(8, 1).toISOString()],
    ]);
    expect(pending[0].template).toEqual({ amountMinor: 450000, currencyCode: 'MAD', categoryId: 'home', title: 'Rent' });
    // Pending occurrences are not expenses: nothing counts until confirmed
    expect(await expenses.search({})).toEqual([source]);
  });

  it('confirm saves a real expense dated when it was due, once; skip and undo', async () => {
    const { expenses, recurrences } = await setup();
    await recurrences.saveRepeating(rent(), 'monthly');
    const [september, august] = await recurrences.pending(local(9, 15));

    const confirmed = await recurrences.confirm(august);
    expect(await expenses.get(confirmed.id)).toMatchObject({ amountMinor: 450000, title: 'Rent', occurredAt: august.dueAt });
    await expect(recurrences.confirm(august)).rejects.toThrow();
    expect(await expenses.search({})).toHaveLength(2);

    await recurrences.skip(september);
    expect(await recurrences.pending(local(9, 15))).toEqual([]);

    await recurrences.unhandle(september.recurrenceId, september.index);
    expect((await recurrences.pending(local(9, 15))).map((o) => o.index)).toEqual([2]);
  });

  it('finds the rule from the expense it started and from the ones it created', async () => {
    const { recurrences } = await setup();
    const source = rent();
    const rule = await recurrences.saveRepeating(source, 'monthly');
    const [august] = await recurrences.pending(local(8, 15));
    const confirmed = await recurrences.confirm(august);

    expect((await recurrences.forExpense(source.id))?.id).toBe(rule.id);
    expect((await recurrences.forExpense(confirmed.id))?.id).toBe(rule.id);
    expect(await recurrences.forExpense('unrelated')).toBeNull();
  });

  it('stopping ends pending occurrences; repeating again replaces the rule', async () => {
    const { expenses, recurrences } = await setup();
    const source = rent();
    const first = await recurrences.saveRepeating(source, 'monthly');
    await recurrences.stop(first.id);
    expect(await recurrences.pending(local(9, 15))).toEqual([]);
    expect(await recurrences.forExpense(source.id)).toBeNull();

    const weekly = await recurrences.repeat((await expenses.get(source.id))!, 'weekly');
    const again = await recurrences.repeat(source, 'yearly');
    expect((await recurrences.forExpense(source.id))?.id).toBe(again.id);
    expect((await recurrences.all()).recurrences.find((r) => r.id === weekly.id)?.active).toBe(false);

    await recurrences.stopStartedBy(source.id);
    expect(await recurrences.forExpense(source.id)).toBeNull();
  });

  it('does not offer occurrences older than 3 months', async () => {
    const { recurrences } = await setup();
    await recurrences.saveRepeating(rent(), 'monthly');
    // Dec 15: Aug–Dec are due; only those from Sep 15 on are offered
    expect((await recurrences.pending(local(12, 15))).map((o) => o.index)).toEqual([5, 4, 3]);
  });
});
