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
});
