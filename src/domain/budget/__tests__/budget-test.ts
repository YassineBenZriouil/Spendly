import { budgetProgress, parseBudget } from '../budget';

describe('budgetProgress', () => {
  it('reports what is left, or how far over', () => {
    expect(budgetProgress(38000, 50000)).toEqual({ budgetMinor: 50000, spentMinor: 38000, remainingMinor: 12000, ratio: 0.76, over: false });
    expect(budgetProgress(53000, 50000)).toMatchObject({ remainingMinor: -3000, ratio: 1.06, over: true });
    expect(budgetProgress(50000, 50000)).toMatchObject({ remainingMinor: 0, over: false });
    expect(budgetProgress(0, 50000)).toMatchObject({ ratio: 0, over: false });
  });
});

describe('parseBudget', () => {
  it('accepts an overall and / or per-category budget', () => {
    expect(parseBudget({ currencyCode: 'EUR', monthlyMinor: 50000, byCategory: {} })).toEqual({ currencyCode: 'EUR', monthlyMinor: 50000, byCategory: {} });
    expect(parseBudget({ currencyCode: 'MAD', byCategory: { food: 200000 } })).toEqual({ currencyCode: 'MAD', byCategory: { food: 200000 } });
  });

  it.each([
    ['no currency', { monthlyMinor: 5, byCategory: {} }],
    ['nothing budgeted', { currencyCode: 'EUR', byCategory: {} }],
    ['zero amount', { currencyCode: 'EUR', monthlyMinor: 0, byCategory: {} }],
    ['fractional amount', { currencyCode: 'EUR', byCategory: { food: 1.5 } }],
    ['not an object', 'lots'],
  ])('rejects %s', (_case, value) => {
    expect(parseBudget(value)).toBeNull();
  });
});
