import { parseExpense } from '../expense.parse';
import { createExpense } from '../expense.service';

const expense = createExpense(
  { amountMinor: 1250, currencyCode: 'EUR', categoryId: 'food', title: 'Lunch', paymentMethod: 'card' },
  new Date('2026-10-13T12:00:00.000Z'),
);

describe('parseExpense', () => {
  it('accepts a valid expense and drops unknown fields', () => {
    expect(parseExpense({ ...expense, injected: true })).toEqual(expense);
  });

  it.each([
    ['not an object', 'x'],
    ['zero amount', { ...expense, amountMinor: 0 }],
    ['fractional amount', { ...expense, amountMinor: 12.5 }],
    ['bad currency', { ...expense, currencyCode: 'euro' }],
    ['missing category', { ...expense, categoryId: '' }],
    ['bad date', { ...expense, occurredAt: 'yesterday' }],
    ['unknown payment method', { ...expense, paymentMethod: 'bitcoin' }],
    ['non-text title', { ...expense, title: 42 }],
  ])('rejects %s', (_case, value) => {
    expect(parseExpense(value)).toBeNull();
  });
});
