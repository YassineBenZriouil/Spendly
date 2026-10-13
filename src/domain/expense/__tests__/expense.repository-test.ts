import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';
import { localDayRange } from '@/utils/dates';

import { createSqliteExpenseRepository } from '../expense.repository';
import { createExpense, updateExpense } from '../expense.service';

jest.mock('expo-sqlite', () => ({}));

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  return createSqliteExpenseRepository(async () => db);
}

const at = (iso: string, amountMinor = 1000, currencyCode = 'EUR', categoryId = 'food') =>
  createExpense({ amountMinor, currencyCode, categoryId }, new Date(iso));

describe('SQLite expense repository', () => {
  it('saves, reads back and is idempotent', async () => {
    const repository = await setup();
    const expense = at('2026-10-13T12:00:00.000Z');
    await repository.save(expense);
    await repository.save(expense);
    expect(await repository.get(expense.id)).toEqual(expense);
    expect(await repository.listBetween(localDayRange(new Date(expense.occurredAt)))).toHaveLength(1);
  });

  it('updates and deletes', async () => {
    const repository = await setup();
    const expense = at('2026-10-13T12:00:00.000Z');
    await repository.save(expense);

    const edited = updateExpense(expense, { amountMinor: 2500, title: 'Lunch', paymentMethod: 'card' });
    await repository.update(edited);
    expect(await repository.get(expense.id)).toEqual(edited);

    await repository.remove(expense.id);
    expect(await repository.get(expense.id)).toBeNull();
    await expect(repository.update(edited)).rejects.toThrow('not found');
  });

  it('does not store blank optional fields', async () => {
    const repository = await setup();
    const expense = { ...at('2026-10-13T12:00:00.000Z'), title: '   ', note: '' };
    await repository.save(expense);
    const stored = await repository.get(expense.id);
    expect(stored).not.toHaveProperty('title');
    expect(stored).not.toHaveProperty('note');
  });

  it('lists and totals by local day (TZ=America/New_York)', async () => {
    const repository = await setup();
    // Oct 13 local: 00:00 = 04:00Z, Oct 14 local starts 04:00Z next day
    await repository.save(at('2026-10-13T03:59:00.000Z', 100)); // Oct 12, 23:59 local
    await repository.save(at('2026-10-13T04:00:00.000Z', 200)); // Oct 13, 00:00 local
    await repository.save(at('2026-10-14T03:59:00.000Z', 300)); // Oct 13, 23:59 local
    await repository.save(at('2026-10-14T04:00:00.000Z', 400)); // Oct 14, 00:00 local
    await repository.save(at('2026-10-13T15:00:00.000Z', 900, 'USD'));

    const oct13 = localDayRange(new Date('2026-10-13T16:00:00.000Z'));
    const list = await repository.listBetween(oct13);
    expect(list.map((e) => e.amountMinor)).toEqual([300, 900, 200]); // newest first

    expect(await repository.totalsBetween(oct13)).toEqual([
      { currencyCode: 'USD', totalMinor: 900 },
      { currencyCode: 'EUR', totalMinor: 500 },
    ]);
  });

  it('notifies subscribers after writes', async () => {
    const repository = await setup();
    const listener = jest.fn();
    const unsubscribe = repository.subscribe(listener);
    const expense = at('2026-10-13T12:00:00.000Z');
    await repository.save(expense);
    await repository.remove(expense.id);
    unsubscribe();
    await repository.save(at('2026-10-13T13:00:00.000Z'));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('fails a write without notifying when the database rejects it', async () => {
    const repository = await setup();
    const listener = jest.fn();
    repository.subscribe(listener);
    await expect(repository.save(at('2026-10-13T12:00:00.000Z', 100, 'EUR', 'missing'))).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});
