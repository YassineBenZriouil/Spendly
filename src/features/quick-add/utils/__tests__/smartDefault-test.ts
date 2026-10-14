import { smartDefaultCategory } from '../smartDefault';

// Jest runs with TZ=America/New_York: local 08:00 on Oct 13, 2026 (EDT) is 12:00Z
const localAt = (day: number, hours: number, minutes = 0) => new Date(2026, 9, day, hours, minutes);
const entry = (categoryId: string, date: Date) => ({ categoryId, occurredAt: date.toISOString() });
const always = () => true;

/** `count` entries in `categoryId` at the given local time on consecutive days. */
const habit = (categoryId: string, count: number, hours: number, minutes = 0) =>
  Array.from({ length: count }, (_, i) => entry(categoryId, localAt(1 + i, hours, minutes)));

describe('smartDefaultCategory', () => {
  const now = localAt(20, 8);

  it('preselects a clear habit at this time of day', () => {
    expect(smartDefaultCategory([...habit('food', 4, 8), ...habit('transport', 1, 8, 30)], now, always)).toBe('food');
  });

  it('needs at least 60% of the entries at this time', () => {
    // 3 of 5 = 60%: enough; 3 of 6 = 50%: not enough
    expect(smartDefaultCategory([...habit('food', 3, 8), ...habit('transport', 2, 8)], now, always)).toBe('food');
    expect(smartDefaultCategory([...habit('food', 3, 8), ...habit('transport', 3, 8)], now, always)).toBeNull();
  });

  it('needs at least 5 entries before calling it a habit', () => {
    expect(smartDefaultCategory(habit('food', 4, 8), now, always)).toBeNull();
    expect(smartDefaultCategory(habit('food', 5, 8), now, always)).toBe('food');
  });

  it('only counts entries within 90 minutes of now, by local time', () => {
    const entries = [...habit('food', 5, 9, 30), ...habit('transport', 5, 9, 31)];
    // 09:30 is exactly 90 minutes after 08:00; 09:31 is outside
    expect(smartDefaultCategory(entries, now, always)).toBe('food');
    // Evening entries never count in the morning
    expect(smartDefaultCategory(habit('food', 10, 20), now, always)).toBeNull();
  });

  it('wraps around midnight', () => {
    expect(smartDefaultCategory(habit('food', 5, 23, 30), localAt(20, 0, 30), always)).toBe('food');
  });

  it('uses local time across a DST change', () => {
    // Nov 1, 2026 is the DST end in New York: 08:00 local is 13:00Z after it, 12:00Z before
    const afterDst = Array.from({ length: 5 }, (_, i) => entry('food', new Date(2026, 10, 2 + i, 8)));
    expect(smartDefaultCategory(afterDst, now, always)).toBe('food');
  });

  it('never preselects a category that cannot be picked (e.g. hidden)', () => {
    expect(smartDefaultCategory(habit('food', 5, 8), now, (id) => id !== 'food')).toBeNull();
  });
});
