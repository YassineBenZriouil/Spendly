import { formatDay, localDaysAgo } from '../dateFormat';

jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));

// TZ=America/New_York (jest.global-setup.js)
const now = new Date('2026-10-13T15:00:00.000Z'); // Oct 13, 11:00 local

describe('formatDay', () => {
  it('names today and yesterday by local calendar day', () => {
    expect(formatDay(new Date('2026-10-13T04:00:00.000Z'), now, 'en-US')).toBe('Today'); // 00:00 local
    expect(formatDay(new Date('2026-10-13T03:59:00.000Z'), now, 'en-US')).toBe('Yesterday'); // 23:59 local
  });

  it('formats older days, adding the year only when it differs', () => {
    expect(formatDay(new Date('2026-10-10T15:00:00.000Z'), now, 'en-US')).toBe('Sat, Oct 10');
    expect(formatDay(new Date('2025-12-31T15:00:00.000Z'), now, 'en-US')).toBe('Wed, Dec 31, 2025');
  });

  it('counts days across DST changes', () => {
    // Nov 1 2026 is 25 hours long in New York
    expect(localDaysAgo(new Date('2026-11-01T12:00:00.000Z'), new Date('2026-11-02T12:00:00.000Z'))).toBe(1);
    expect(localDaysAgo(new Date('2026-03-08T12:00:00.000Z'), new Date('2026-03-09T12:00:00.000Z'))).toBe(1);
  });
});
