import { createSqliteExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense, updateExpense } from '@/domain/expense/expense.service';
import { createSqliteRecurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import { migrate } from '@/storage/database/migrations';
import { createTestDatabase } from '@/storage/database/testing/createTestDatabase';

import type { UndoAction } from '../../state/undoStore';
import { performUndo } from '../useUndo';

jest.mock('expo-sqlite', () => ({}));
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {} }));

async function setup() {
  const db = createTestDatabase();
  await migrate(db);
  const database = async () => db;
  const expenses = createSqliteExpenseRepository(database);
  const recurrences = createSqliteRecurrenceRepository(database);
  const undo = (action: Omit<UndoAction, 'expiresAt'>) => performUndo({ ...action, expiresAt: 0 }, expenses, recurrences);
  return { expenses, recurrences, undo };
}

const expense = createExpense({ amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T12:00:00.000Z'));

describe('performUndo', () => {
  it('undoing a save removes the expense, and stops a repeat it started', async () => {
    const { expenses, recurrences, undo } = await setup();
    await recurrences.saveRepeating(expense, 'daily');
    await undo({ kind: 'saved', expense });
    expect(await expenses.get(expense.id)).toBeNull();
    expect(await recurrences.forExpense(expense.id)).toBeNull();
  });

  it('undoing a delete brings the expense back exactly', async () => {
    const { expenses, undo } = await setup();
    await expenses.save(expense);
    await expenses.remove(expense.id);
    await undo({ kind: 'deleted', expense });
    expect(await expenses.get(expense.id)).toEqual(expense);
  });

  it('undoing an edit puts the previous version back', async () => {
    const { expenses, undo } = await setup();
    await expenses.save(expense);
    await expenses.update(updateExpense(expense, { amountMinor: 99, title: 'Changed' }));
    await undo({ kind: 'edited', expense });
    expect(await expenses.get(expense.id)).toEqual(expense);
  });

  it('undoing a confirm removes its expense and makes the occurrence pending again; same for skip', async () => {
    const { expenses, recurrences, undo } = await setup();
    await recurrences.saveRepeating(expense, 'daily');
    const now = new Date('2026-10-15T23:00:00.000Z');
    const [second, first] = await recurrences.pending(now);

    const confirmed = await recurrences.confirm(first);
    await undo({ kind: 'confirmed', expense: confirmed, occurrence: { recurrenceId: first.recurrenceId, index: first.index } });
    expect(await expenses.get(confirmed.id)).toBeNull();

    await recurrences.skip(second);
    await undo({ kind: 'skipped', expense, occurrence: { recurrenceId: second.recurrenceId, index: second.index } });
    expect((await recurrences.pending(now)).map((occurrence) => occurrence.index)).toEqual([2, 1]);
  });
});
