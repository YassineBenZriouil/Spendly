import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense, updateExpense } from '@/domain/expense/expense.service';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import { performUndo } from '../useUndo';

jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {} }));

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  return createSqliteExpenseRepository(async () => db);
}

const expense = createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T12:00:00.000Z'));
const action = (kind: 'saved' | 'deleted' | 'edited', value = expense) => ({ kind, expense: value, expiresAt: 0 });

describe('performUndo', () => {
  it('undoing a save removes the expense', async () => {
    const repository = await setup();
    await repository.save(expense);
    await performUndo(action('saved'), repository);
    expect(await repository.get(expense.id)).toBeNull();
  });

  it('undoing a delete brings the expense back exactly', async () => {
    const repository = await setup();
    await repository.save(expense);
    await repository.remove(expense.id);
    await performUndo(action('deleted'), repository);
    expect(await repository.get(expense.id)).toEqual(expense);
  });

  it('undoing an edit puts the previous version back', async () => {
    const repository = await setup();
    await repository.save(expense);
    await repository.update(updateExpense(expense, { amountMinor: 99, title: 'Changed' }));
    await performUndo(action('edited'), repository);
    expect(await repository.get(expense.id)).toEqual(expense);
  });
});
