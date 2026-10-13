import { addLocalDays, localDayRange, startOfLocalDay } from '../dates';

// Runs with TZ=America/New_York (jest.global-setup.js) so DST transitions are exercised

describe('local day boundaries', () => {
  it('starts the day at local midnight', () => {
    const lateEvening = new Date('2026-10-14T03:30:00.000Z'); // 23:30 on Oct 13 in New York
    expect(startOfLocalDay(lateEvening).toISOString()).toBe('2026-10-13T04:00:00.000Z');
    expect(localDayRange(lateEvening)).toEqual({
      start: '2026-10-13T04:00:00.000Z',
      end: '2026-10-14T04:00:00.000Z',
    });
  });

  it('handles the 23-hour spring-forward day', () => {
    const range = localDayRange(new Date('2026-03-08T15:00:00.000Z'));
    expect(range).toEqual({ start: '2026-03-08T05:00:00.000Z', end: '2026-03-09T04:00:00.000Z' });
  });

  it('handles the 25-hour fall-back day', () => {
    const range = localDayRange(new Date('2026-11-01T15:00:00.000Z'));
    expect(range).toEqual({ start: '2026-11-01T04:00:00.000Z', end: '2026-11-02T05:00:00.000Z' });
  });

  it('adds calendar days across month ends', () => {
    expect(addLocalDays(new Date(2026, 0, 31), 1).getDate()).toBe(1);
    expect(addLocalDays(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
  });
});
