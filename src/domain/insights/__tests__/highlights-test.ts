import {
  buildHighlights,
  changeVsUsual,
  isNotableChange,
  median,
  usualByCategory,
  type HighlightInput,
  type PeriodSpend,
} from '../highlights';

const names: Record<string, string> = { food: 'Food', transport: 'Transport', bills: 'Bills', coffee: 'Coffee' };
const spend = (byCategory: Record<string, number>, counts: Record<string, number> = {}): PeriodSpend => ({
  totalMinor: Object.values(byCategory).reduce((sum, value) => sum + value, 0),
  byCategory: Object.entries(byCategory).map(([categoryId, totalMinor]) => ({
    categoryId,
    totalMinor,
    count: counts[categoryId] ?? 1,
  })),
});
const weeks = (count: number, byCategory: Record<string, number>) => Array.from({ length: count }, () => spend(byCategory));

function input(overrides: Partial<HighlightInput>): HighlightInput {
  return {
    kind: 'week',
    currencyCode: 'EUR',
    isCurrent: true,
    current: spend({}),
    baseline: [],
    days: [],
    minimumMinor: 1000,
    categoryName: (id) => names[id] ?? id,
    dayName: (day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()],
    ...overrides,
  };
}
const texts = (value: HighlightInput) => buildHighlights(value).map((highlight) => highlight.text);

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(3); // (2 + 3) / 2 = 2.5 → rounded
    expect(median([])).toBe(0);
  });
});

describe('notable changes', () => {
  it('needs both 30% and the minimum amount', () => {
    expect(isNotableChange(13000, 10000, 1000)).toBe(true); // +30%, +30 €
    expect(isNotableChange(12900, 10000, 1000)).toBe(false); // +29%
    expect(isNotableChange(400, 200, 1000)).toBe(false); // 2 € → 4 €: +100% but only 2 €
    expect(isNotableChange(5000, 0, 1000)).toBe(false); // no usual to compare with
  });

  it('describes the change in words', () => {
    expect(changeVsUsual(14500, 10000, 1000)).toEqual({ direction: 'up', percent: 45 });
    expect(changeVsUsual(7000, 10000, 1000)).toEqual({ direction: 'down', percent: 30 });
    expect(changeVsUsual(10500, 10000, 1000)).toEqual({ direction: 'same', percent: 5 });
    expect(changeVsUsual(10500, 0, 1000)).toBeNull();
  });

  it('counts a category missing from a period as zero in the usual', () => {
    expect(usualByCategory([spend({ food: 100 }), spend({}), spend({ food: 300 })]).get('food')).toBe(100);
  });
});

describe('buildHighlights', () => {
  it('makes no "unusual" claims with fewer than 4 earlier periods', () => {
    const highlights = buildHighlights(input({ current: spend({ food: 50000 }), baseline: weeks(3, { food: 10000 }) }));
    expect(highlights).toEqual([
      expect.objectContaining({ kind: 'learning', text: "After a few weeks of history, Spendly will point out what's unusual" }),
    ]);
  });

  it('says so when nothing stands out', () => {
    expect(texts(input({ current: spend({ food: 10500 }), baseline: weeks(8, { food: 10000 }) }))).toEqual([
      'A normal week: nothing stands out',
    ]);
  });

  it('spots overall and per-category changes against the median, in plain words', () => {
    const baseline = [...weeks(6, { food: 10000, transport: 4000 }), spend({ food: 90000 }), spend({ food: 1 })];
    const result = texts(input({ current: spend({ food: 14500, transport: 4000 }), baseline }));
    // Usual total: median of 14000 ×6, 90000, 1 = 14000. 18500 vs 14000 = +32%
    expect(result).toEqual([
      "You've spent 32% more than in a usual week",
      'Food is up 45% compared with your usual week',
    ]);
  });

  it('notices a regular category with nothing spent, and downs', () => {
    const result = texts(
      input({ current: spend({ food: 5000, bills: 20000 }), baseline: weeks(8, { food: 10000, transport: 3000, bills: 20000 }) }),
    );
    expect(result).toEqual(['Food is down 50% compared with your usual week', "You haven't spent on Transport this week"]);
  });

  it('uses past tense for an earlier period', () => {
    const result = texts(input({ isCurrent: false, current: spend({ food: 5000 }), baseline: weeks(8, { food: 10000, transport: 3000 }) }));
    expect(result).toEqual([
      'You spent 62% less than in a usual week', // 5000 vs usual 13000
      'Food was down 50% compared with your usual week',
      "You didn't spend on Transport that week",
    ]);
  });

  it('keeps the 3 biggest by money, ties broken the same way every time', () => {
    const baseline = weeks(8, { food: 10000, transport: 10000, bills: 10000, coffee: 10000 });
    const current = spend({ food: 30000, transport: 30000, bills: 30000, coffee: 30000 });
    const highlights = buildHighlights(input({ current, baseline }));
    expect(highlights).toHaveLength(3);
    expect(highlights.map((highlight) => highlight.id)).toEqual(['total', 'category:bills', 'category:coffee']);
    expect(buildHighlights(input({ current, baseline }))).toEqual(highlights);
  });

  it('points out a day that holds most of the spending, and a dominant category', () => {
    const days = [
      { day: new Date(2026, 9, 12), totalMinor: 1000 },
      { day: new Date(2026, 9, 17), totalMinor: 8200 },
    ];
    const current = spend({ food: 9200 }, { food: 4 });
    expect(texts(input({ current, days }))).toEqual([
      'Biggest day: Sat, €82.00',
      'Food is your most frequent category (4 expenses)',
    ]);
  });

  it('writes amounts in the period currency', () => {
    const days = [
      { day: new Date(2026, 9, 12), totalMinor: 10000 },
      { day: new Date(2026, 9, 13), totalMinor: 50000 },
    ];
    expect(texts(input({ currencyCode: 'MAD', current: spend({ food: 60000 }), days }))[0]).toMatch(/Biggest day: Tue, MAD\s?500\.00/);
  });

  it('links category highlights to their category', () => {
    const [highlight] = buildHighlights(input({ current: spend({ food: 30000 }), baseline: weeks(8, { food: 10000 }) })).filter(
      (item) => item.kind === 'categoryUp',
    );
    expect(highlight.categoryId).toBe('food');
  });
});
