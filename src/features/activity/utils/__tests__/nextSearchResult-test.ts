import { createExpense } from '@/domain/expense/expense.service';

import { nextSearchResult, ROW_ANIMATION_LIMIT } from '../nextSearchResult';

const expense = () => createExpense({ amountMinor: 100, currencyCode: 'EUR', categoryId: 'food' }, new Date('2026-10-13T12:00:00Z'));
const many = (count: number) => Array.from({ length: count }, expense);

describe('nextSearchResult', () => {
  it('first result: nothing fresh', () => {
    const result = nextSearchResult(null, many(3), 'all');
    expect(result.freshIds.size).toBe(0);
    expect(result.listKey).toBe(1);
  });

  it('a small write animates only the added rows, in the same list', () => {
    const first = nextSearchResult(null, many(3), 'all');
    const added = expense();
    const next = nextSearchResult(first, [added, ...first.expenses], 'all');
    expect([...next.freshIds]).toEqual([added.id]);
    expect(next.listKey).toBe(first.listKey);
  });

  it('a removal keeps the list (neighbours slide)', () => {
    const first = nextSearchResult(null, many(3), 'all');
    const next = nextSearchResult(first, first.expenses.slice(1), 'all');
    expect(next.freshIds.size).toBe(0);
    expect(next.listKey).toBe(first.listKey);
  });

  it('a new filter replaces the list without row animations', () => {
    const first = nextSearchResult(null, many(3), 'all');
    const next = nextSearchResult(first, many(2), 'food');
    expect(next.freshIds.size).toBe(0);
    expect(next.listKey).toBe(first.listKey + 1);
  });

  it('a bulk write replaces the list without row animations', () => {
    const first = nextSearchResult(null, many(3), 'all');
    const next = nextSearchResult(first, [...many(ROW_ANIMATION_LIMIT + 1), ...first.expenses], 'all');
    expect(next.freshIds.size).toBe(0);
    expect(next.listKey).toBe(first.listKey + 1);
  });

  it('a bulk removal replaces the list too', () => {
    const first = nextSearchResult(null, many(ROW_ANIMATION_LIMIT + 2), 'all');
    const next = nextSearchResult(first, first.expenses.slice(0, 1), 'all');
    expect(next.listKey).toBe(first.listKey + 1);
  });
});
