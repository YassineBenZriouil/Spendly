import { createInMemoryExpenseRepository } from '../expense.repository';
import { createExpense, validateNewExpense } from '../expense.service';

const valid = { amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food' };

describe('validateNewExpense', () => {
  it('accepts a valid expense', () => {
    expect(validateNewExpense(valid)).toBeNull();
  });

  it('rejects zero, negative and fractional amounts', () => {
    expect(validateNewExpense({ ...valid, amountMinor: 0 })).not.toBeNull();
    expect(validateNewExpense({ ...valid, amountMinor: -5 })).not.toBeNull();
    expect(validateNewExpense({ ...valid, amountMinor: 12.5 })).not.toBeNull();
  });

  it('rejects a missing category or a bad currency', () => {
    expect(validateNewExpense({ ...valid, categoryId: '' })).not.toBeNull();
    expect(validateNewExpense({ ...valid, currencyCode: 'euro' })).not.toBeNull();
  });
});

describe('createExpense', () => {
  it('stamps ids and timestamps', () => {
    const now = new Date('2026-10-13T10:00:00.000Z');
    const expense = createExpense(valid, now);
    expect(expense).toMatchObject({ ...valid, occurredAt: now.toISOString(), createdAt: now.toISOString() });
    expect(expense.id).not.toBe(createExpense(valid, now).id);
  });

  it('throws on invalid input', () => {
    expect(() => createExpense({ ...valid, amountMinor: 0 })).toThrow();
  });
});

describe('in-memory repository', () => {
  it('saves idempotently and removes', async () => {
    const repository = createInMemoryExpenseRepository();
    const expense = createExpense(valid);
    await repository.save(expense);
    await repository.save(expense);
    expect(await repository.list()).toHaveLength(1);
    await repository.remove(expense.id);
    expect(await repository.list()).toHaveLength(0);
  });
});
