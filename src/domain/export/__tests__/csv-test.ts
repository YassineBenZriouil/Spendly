import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { createExpense } from '@/domain/expense/expense.service';

import { expensesToCsv, minorToDecimal } from '../csv';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US', currencyCode: 'USD' }] }));

// TZ=America/New_York (jest.global-setup.js)
describe('CSV export', () => {
  it('formats minor units for each currency exponent', () => {
    expect(minorToDecimal(1250, 2)).toBe('12.50');
    expect(minorToDecimal(5, 2)).toBe('0.05');
    expect(minorToDecimal(500, 0)).toBe('500');
    expect(minorToDecimal(12345, 3)).toBe('12.345');
  });

  it('writes a header and one row per expense, oldest first, in local time', () => {
    const later = createExpense({
      amountMinor: 1250,
      currencyCode: 'EUR',
      categoryId: 'food',
      title: 'Lunch, with "Sam"',
      note: 'line one\nline two',
      paymentMethod: 'card',
      occurredAt: '2026-10-14T03:30:00.000Z', // Oct 13, 23:30 local
    });
    const earlier = createExpense({
      amountMinor: 500,
      currencyCode: 'JPY',
      categoryId: 'transport',
      occurredAt: '2026-10-12T14:05:00.000Z',
    });

    const csv = expensesToCsv([later, earlier], BuiltInCategories);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.slice(1).split('\r\n')).toEqual([
      'Date,Time,Amount,Currency,Category,Title,Note,Payment method,Occurred at (UTC),Type',
      '2026-10-12,10:05,500,JPY,Transport,,,,2026-10-12T14:05:00.000Z,Expense',
      '2026-10-13,23:30,12.50,EUR,Food,"Lunch, with ""Sam""","line one\nline two",card,2026-10-14T03:30:00.000Z,Expense',
      '',
    ]);
  });

  it('marks income in the Type column', () => {
    const salary = createExpense({ amountMinor: 200000, currencyCode: 'EUR', categoryId: 'other', kind: 'income' });
    expect(expensesToCsv([salary], BuiltInCategories).split('\r\n')[1]).toMatch(/,Income$/);
  });

  it('neutralises text that a spreadsheet would run as a formula', () => {
    const expense = createExpense({
      amountMinor: 100,
      currencyCode: 'USD',
      categoryId: 'other',
      title: '=HYPERLINK("http://x")',
      note: '-2+3',
    });
    const row = expensesToCsv([expense], BuiltInCategories).split('\r\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(row).toContain(`'-2+3`);
  });
});
