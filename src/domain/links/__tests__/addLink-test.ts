import { BuiltInCategories } from '@/domain/category/builtInCategories';
import { createCategory } from '@/domain/category/category.service';

import { findCategory, parseAddLink, parseAmount } from '../addLink';

const coffee = createCategory({ name: 'Café du coin', icon: 'coffee', colorToken: 'amber' }, 10);
const categories = [...BuiltInCategories, coffee];
const parse = (params: Record<string, string>, quickLog?: { amountMinor: number; currencyCode: string; categoryId: string }) =>
  parseAddLink(params, { categories, defaultCurrency: 'EUR', quickLog });

describe('parseAmount', () => {
  it('reads major units in the currency, with either decimal mark and Arabic digits', () => {
    expect(parseAmount('20', 'EUR')).toBe(2000);
    expect(parseAmount('4.5', 'EUR')).toBe(450);
    expect(parseAmount('4,50', 'EUR')).toBe(450);
    expect(parseAmount('٢٠', 'EUR')).toBe(2000);
    expect(parseAmount('١٢٫٥', 'EUR')).toBe(1250);
    expect(parseAmount('500', 'JPY')).toBe(500);
  });

  it('rejects what is not a positive amount in that currency', () => {
    for (const bad of ['0', '-5', 'abc', '1e3', '']) expect(parseAmount(bad, 'EUR')).toBeNull();
  });
});

describe('findCategory', () => {
  it('finds a category by id, stored name, or a built-in name in English or Arabic, ignoring case and spaces', () => {
    expect(findCategory('food', categories)).toBe('food');
    expect(findCategory('  FOOD ', categories)).toBe('food');
    expect(findCategory('طعام', categories)).toBe('food');
    expect(findCategory('café  du coin', categories)).toBe(coffee.id);
    expect(findCategory('Rocket', categories)).toBeUndefined();
  });
});

describe('parseAddLink', () => {
  it('"Log 20 Food": saves at once', () => {
    expect(parse({ amount: '20', category: 'Food', save: '1' })).toEqual({
      request: { amountMinor: 2000, currencyCode: 'EUR', categoryId: 'food', save: true },
      problem: null,
    });
  });

  it('in Arabic, with a currency', () => {
    expect(parse({ amount: '٢٠', category: 'طعام', currency: 'mad', save: 'true' }).request).toEqual({
      amountMinor: 2000,
      currencyCode: 'MAD',
      categoryId: 'food',
      save: true,
    });
  });

  it('without save, or with nothing: opens Add (pre-filled with what it has)', () => {
    expect(parse({ category: 'transport' })).toEqual({ request: { currencyCode: 'EUR', categoryId: 'transport', save: false }, problem: null });
    expect(parse({})).toEqual({ request: { currencyCode: 'EUR', save: false }, problem: null });
  });

  it('never saves when something is wrong, and says what', () => {
    expect(parse({ amount: 'lots', category: 'food', save: '1' })).toEqual({
      request: { currencyCode: 'EUR', categoryId: 'food', save: false },
      problem: 'amount',
    });
    expect(parse({ amount: '20', category: 'Rocket', save: '1' })).toEqual({
      request: { amountMinor: 2000, currencyCode: 'EUR', save: false },
      problem: 'category',
    });
    expect(parse({ amount: '20', save: '1' }).problem).toBe('category');
    expect(parse({ category: 'food', save: '1' }).problem).toBe('amount');
    expect(parse({ amount: '20', currency: 'EURO', category: 'food', save: '1' }).problem).toBe('currency');
    expect(parse({ amount: '20', currency: 'XYZ1', category: 'food' }).request.currencyCode).toBe('EUR');
  });

  it('quick=1 uses the Quick log from Settings', () => {
    const quickLog = { amountMinor: 450, currencyCode: 'EUR', categoryId: coffee.id };
    expect(parse({ quick: '1' }, quickLog)).toEqual({ request: { ...quickLog, save: true }, problem: null });
    expect(parse({ quick: '1' }).problem).toBe('noQuickLog');
    // Its category was deleted since: open Add with the amount, never save into a missing category
    expect(parse({ quick: '1' }, { ...quickLog, categoryId: 'gone' })).toEqual({
      request: { amountMinor: 450, currencyCode: 'EUR', categoryId: undefined, save: false },
      problem: 'category',
    });
  });
});
