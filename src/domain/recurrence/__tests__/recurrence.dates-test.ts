import { dueOccurrences, occurrenceDate } from '../recurrence.dates';

// Jest runs with TZ=America/New_York (DST starts Mar 8, ends Nov 1, 2026)
const at = (year: number, month: number, day: number, hours = 9, minutes = 0) => new Date(year, month - 1, day, hours, minutes);
const local = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
const series = (anchor: Date, frequency: Parameters<typeof occurrenceDate>[1], count: number) =>
  Array.from({ length: count }, (_, i) => local(occurrenceDate(anchor, frequency, i + 1)));

describe('occurrenceDate', () => {
  it('daily and weekly keep the time of day across a DST change', () => {
    expect(series(at(2026, 10, 30, 8, 30), 'daily', 3)).toEqual(['2026-10-31 08:30', '2026-11-01 08:30', '2026-11-02 08:30']);
    expect(series(at(2026, 3, 1, 8, 30), 'weekly', 2)).toEqual(['2026-03-08 08:30', '2026-03-15 08:30']);
  });

  it('monthly on the 31st uses the last day of short months and comes back to the 31st', () => {
    expect(series(at(2026, 1, 31), 'monthly', 4)).toEqual([
      '2026-02-28 09:00',
      '2026-03-31 09:00',
      '2026-04-30 09:00',
      '2026-05-31 09:00',
    ]);
  });

  it('handles leap years', () => {
    expect(series(at(2027, 12, 29), 'monthly', 2)).toEqual(['2028-01-29 09:00', '2028-02-29 09:00']);
    expect(series(at(2028, 2, 29), 'yearly', 4)).toEqual([
      '2029-02-28 09:00',
      '2030-02-28 09:00',
      '2031-02-28 09:00',
      '2032-02-29 09:00',
    ]);
  });

  it('crosses year ends', () => {
    expect(series(at(2026, 11, 15), 'monthly', 3)).toEqual(['2026-12-15 09:00', '2027-01-15 09:00', '2027-02-15 09:00']);
  });
});

describe('dueOccurrences', () => {
  const anchor = at(2026, 1, 31);

  it('lists due, unhandled occurrences within the window, oldest first', () => {
    const due = dueOccurrences(anchor, 'monthly', new Set([2]), at(2026, 5, 31, 12), at(2026, 1, 1));
    expect(due.map(({ index, dueAt }) => [index, local(dueAt)])).toEqual([
      [1, '2026-02-28 09:00'],
      [3, '2026-04-30 09:00'],
      [4, '2026-05-31 09:00'],
    ]);
  });

  it('is not due before its time on the day', () => {
    expect(dueOccurrences(anchor, 'monthly', new Set(), at(2026, 2, 28, 8, 59), at(2026, 1, 1))).toEqual([]);
  });

  it('stops offering occurrences older than the window after a long gap', () => {
    const due = dueOccurrences(at(2025, 1, 1), 'weekly', new Set(), at(2026, 10, 14), at(2026, 7, 14));
    // Wednesdays (Jan 1, 2025 was one) from Jul 15 to Oct 14, 2026, both included
    expect(due.length).toBe(14);
    expect(due[0].dueAt >= at(2026, 7, 14)).toBe(true);
  });
});
