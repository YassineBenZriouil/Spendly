import { createExpense } from '@/domain/expense/expense.service';

import { groupByDay } from '../groupByDay';

// TZ=America/New_York (jest.global-setup.js)
const at = (iso: string, amountMinor: number, currencyCode = 'EUR') =>
  createExpense({ amountMinor, currencyCode, categoryId: 'food', occurredAt: iso });

describe('groupByDay', () => {
  it('groups newest-first expenses by local day with per-currency totals', () => {
    const items = groupByDay([
      at('2026-10-14T03:59:00.000Z', 300), // Oct 13, 23:59 local
      at('2026-10-13T15:00:00.000Z', 900, 'USD'),
      at('2026-10-13T04:00:00.000Z', 200), // Oct 13, 00:00 local
      at('2026-10-13T03:59:00.000Z', 100), // Oct 12, 23:59 local
    ]);

    expect(items.map((item) => item.type)).toEqual(['day', 'expense', 'expense', 'expense', 'day', 'expense']);
    expect(items[0]).toMatchObject({
      key: '2026-10-13T04:00:00.000Z',
      totals: [
        { currencyCode: 'EUR', totalMinor: 500 },
        { currencyCode: 'USD', totalMinor: 900 },
      ],
    });
    expect(items[4]).toMatchObject({ key: '2026-10-12T04:00:00.000Z', totals: [{ currencyCode: 'EUR', totalMinor: 100 }] });
  });

  it('returns nothing for no expenses', () => {
    expect(groupByDay([])).toEqual([]);
  });

  it('puts due repeating expenses first on their day and never counts them in totals', () => {
    const occurrence = {
      recurrenceId: 'r1',
      index: 2,
      dueAt: '2026-10-13T13:00:00.000Z',
      frequency: 'monthly' as const,
      template: { amountMinor: 450000, currencyCode: 'MAD', categoryId: 'home' },
    };
    const older = { ...occurrence, index: 1, dueAt: '2026-10-11T13:00:00.000Z' };
    const lunch = createExpense({ amountMinor: 1200, currencyCode: 'MAD', categoryId: 'food' }, new Date('2026-10-13T16:00:00.000Z'));
    const items = groupByDay([lunch], [occurrence, older]);

    expect(items.map((item) => item.type)).toEqual(['day', 'pending', 'expense', 'day', 'pending']);
    const [today, , , earlier] = items;
    expect(today.type === 'day' && today.totals).toEqual([{ currencyCode: 'MAD', totalMinor: 1200 }]);
    expect(earlier.type === 'day' && earlier.totals).toEqual([]);
  });
});
