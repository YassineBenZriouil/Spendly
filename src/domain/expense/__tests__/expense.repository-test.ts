import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';
import { localDayRange } from '@/utils/dates';

import { createSqliteExpenseRepository, SUGGESTION_MIN_HISTORY } from '../expense.repository';
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

  it('searches title, note and category name literally, newest first, with a category filter', async () => {
    const repository = await setup();
    const lunch = { ...at('2026-10-13T12:00:00.000Z'), title: 'Lunch 100%' };
    const taxi = { ...at('2026-10-13T13:00:00.000Z', 500, 'EUR', 'transport'), note: 'taxi to lunch' };
    const plain = at('2026-10-13T14:00:00.000Z', 700, 'EUR', 'groceries');
    await repository.saveMany([lunch, taxi, plain]);

    expect((await repository.search({})).map((e) => e.id)).toEqual([plain.id, taxi.id, lunch.id]);
    expect((await repository.search({ text: 'LUNCH' })).map((e) => e.id)).toEqual([taxi.id, lunch.id]);
    expect((await repository.search({ text: 'groc' })).map((e) => e.id)).toEqual([plain.id]);
    expect((await repository.search({ text: '0%' })).map((e) => e.id)).toEqual([lunch.id]);
    expect(await repository.search({ text: '_' })).toEqual([]);
    expect((await repository.search({ text: 'lunch', categoryId: 'transport' })).map((e) => e.id)).toEqual([taxi.id]);
  });

  it('saves many in one transaction with a single notification', async () => {
    const repository = await setup();
    const listener = jest.fn();
    repository.subscribe(listener);
    const good = at('2026-10-13T12:00:00.000Z');
    await expect(repository.saveMany([good, at('2026-10-13T12:00:00.000Z', 100, 'EUR', 'missing')])).rejects.toThrow();
    expect(await repository.get(good.id)).toBeNull(); // rolled back
    await repository.saveMany([good, at('2026-10-13T13:00:00.000Z')]);
    expect(await repository.search({})).toHaveLength(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe('amountSuggestions', () => {
    const since = '2026-07-01T00:00:00.000Z';
    const save = async (repository: Awaited<ReturnType<typeof setup>>, entries: [string, number, string?, string?][]) => {
      for (const [iso, amount, currency = 'EUR', category = 'food'] of entries) await repository.save(at(iso, amount, currency, category));
    };

    it('ranks by use, then most recent use, then smallest amount, and returns at most 3', async () => {
      const repository = await setup();
      await save(repository, [
        ['2026-10-01T08:00:00.000Z', 450],
        ['2026-10-02T08:00:00.000Z', 450],
        ['2026-10-03T08:00:00.000Z', 450],
        ['2026-10-01T12:00:00.000Z', 1200], // tie with 900 on uses, used more recently
        ['2026-10-09T12:00:00.000Z', 1200],
        ['2026-10-02T12:00:00.000Z', 900],
        ['2026-10-05T12:00:00.000Z', 900],
        ['2026-10-04T12:00:00.000Z', 300], // tie with 200 on uses and recency: smaller first
        ['2026-10-04T12:00:00.000Z', 200],
      ]);
      expect(await repository.amountSuggestions('food', 'EUR', since)).toEqual([450, 1200, 900]);
    });

    it(`stays empty until the category has ${SUGGESTION_MIN_HISTORY} expenses in the window`, async () => {
      const repository = await setup();
      await save(repository, [
        ['2026-06-15T08:00:00.000Z', 450], // before the window
        ['2026-10-01T08:00:00.000Z', 450],
        ['2026-10-02T08:00:00.000Z', 500],
      ]);
      expect(await repository.amountSuggestions('food', 'EUR', since)).toEqual([]);
      await save(repository, [['2026-10-03T08:00:00.000Z', 600]]);
      // Each used once: most recent first
      expect(await repository.amountSuggestions('food', 'EUR', since)).toEqual([600, 500, 450]);
    });

    it('keeps currencies and categories apart', async () => {
      const repository = await setup();
      await save(repository, [
        ['2026-10-01T08:00:00.000Z', 450],
        ['2026-10-02T08:00:00.000Z', 450],
        ['2026-10-03T08:00:00.000Z', 450, 'USD'],
        ['2026-10-04T08:00:00.000Z', 450, 'EUR', 'transport'],
      ]);
      // Only 2 food expenses in EUR: not enough history
      expect(await repository.amountSuggestions('food', 'EUR', since)).toEqual([]);
      await save(repository, [['2026-10-05T08:00:00.000Z', 700]]);
      expect(await repository.amountSuggestions('food', 'EUR', since)).toEqual([450, 700]);
      expect(await repository.amountSuggestions('food', 'USD', since)).toEqual([]);
    });
  });

  it('lists category and time of expenses since a date', async () => {
    const repository = await setup();
    await repository.save(at('2026-09-01T08:00:00.000Z', 100, 'EUR', 'transport'));
    await repository.save(at('2026-10-01T08:00:00.000Z', 100, 'EUR', 'food'));
    expect(await repository.categoryTimes('2026-09-15T00:00:00.000Z')).toEqual([
      { categoryId: 'food', occurredAt: '2026-10-01T08:00:00.000Z' },
    ]);
  });
});
