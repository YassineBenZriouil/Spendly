import { pluralCategory } from '../plural';

describe('pluralCategory', () => {
  it('English: one / other', () => {
    expect([0, 1, 2, 5, 21].map((n) => pluralCategory('en', n))).toEqual(['other', 'one', 'other', 'other', 'other']);
  });

  it('Arabic: zero / one / two / few / many / other (CLDR)', () => {
    const cases: [number, string][] = [
      [0, 'zero'],
      [1, 'one'],
      [2, 'two'],
      [3, 'few'],
      [10, 'few'],
      [11, 'many'],
      [99, 'many'],
      [100, 'other'],
      [102, 'other'],
      [103, 'few'],
      [111, 'many'],
      [1000, 'other'],
    ];
    for (const [n, category] of cases) expect(pluralCategory('ar', n)).toBe(category);
  });
});
