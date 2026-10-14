import { againFrom, createExpense, updateExpense, validateNewExpense } from '../expense.service';

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

describe('updateExpense', () => {
  const original = createExpense(valid, new Date('2026-10-13T10:00:00.000Z'));

  it('applies changes and bumps updatedAt only', () => {
    const later = new Date('2026-10-14T08:00:00.000Z');
    const updated = updateExpense(original, { amountMinor: 900, note: 'lunch' }, later);
    expect(updated).toMatchObject({ amountMinor: 900, note: 'lunch', currencyCode: 'EUR' });
    expect(updated.createdAt).toBe(original.createdAt);
    expect(updated.updatedAt).toBe(later.toISOString());
  });

  it('rejects invalid edits', () => {
    expect(() => updateExpense(original, { amountMinor: 0 })).toThrow();
    expect(() => updateExpense(original, { occurredAt: 'not a date' })).toThrow();
  });
});

describe('expense details', () => {
  it('keeps given details, trimmed, and drops blank ones', () => {
    const expense = createExpense({
      ...valid,
      title: '  Café  ',
      note: '   ',
      paymentMethod: 'card',
      occurredAt: '2026-10-12T18:30:00.000Z',
    });
    expect(expense).toMatchObject({ title: 'Café', paymentMethod: 'card', occurredAt: '2026-10-12T18:30:00.000Z' });
    expect(expense).not.toHaveProperty('note');
  });

  it('clears a field when an edit sets it to undefined or blank', () => {
    const original = createExpense({ ...valid, title: 'Lunch', note: 'with Sam', paymentMethod: 'cash' });
    const edited = updateExpense(original, { title: '', note: undefined, paymentMethod: undefined });
    expect(edited).not.toHaveProperty('title');
    expect(edited).not.toHaveProperty('note');
    expect(edited).not.toHaveProperty('paymentMethod');
  });

  it('rejects an invalid date', () => {
    expect(() => createExpense({ ...valid, occurredAt: 'yesterday' })).toThrow('Date is invalid');
  });
});

describe('againFrom', () => {
  it('copies category, amount, currency and title into a new expense dated now', () => {
    const source = createExpense(
      { amountMinor: 450, currencyCode: 'EUR', categoryId: 'food', title: 'Coffee', note: 'oat milk', paymentMethod: 'card' },
      new Date('2026-10-01T08:00:00.000Z'),
    );
    const now = new Date('2026-10-14T09:30:00.000Z');
    const again = againFrom(source, now);
    expect(again).toMatchObject({ amountMinor: 450, currencyCode: 'EUR', categoryId: 'food', title: 'Coffee', occurredAt: now.toISOString() });
    expect(again.id).not.toBe(source.id);
    expect(again).not.toHaveProperty('note');
    expect(again).not.toHaveProperty('paymentMethod');
  });
});
