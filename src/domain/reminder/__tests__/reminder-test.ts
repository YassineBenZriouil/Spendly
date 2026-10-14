import { isReminderTime, reminderDates } from '../reminder';

// TZ=America/New_York (jest.global-setup.js). DST ends Sunday Nov 1, 2026; starts Sunday Mar 8, 2026.
const local = (month: number, day: number, hour: number, minute = 0) => new Date(2026, month, day, hour, minute);
const EVENING = { hour: 20, minute: 30 };

describe('reminderDates', () => {
  it('today and the next days at the chosen time, while nothing is logged today', () => {
    const dates = reminderDates(EVENING, local(9, 14, 9), null, 3);
    expect(dates).toEqual([local(9, 14, 20, 30), local(9, 15, 20, 30), local(9, 16, 20, 30)]);
  });

  it('skips today once something was logged today', () => {
    const dates = reminderDates(EVENING, local(9, 14, 9), local(9, 14, 8, 15), 3);
    expect(dates).toEqual([local(9, 15, 20, 30), local(9, 16, 20, 30)]);
  });

  it('something logged yesterday does not skip today', () => {
    const dates = reminderDates(EVENING, local(9, 14, 9), local(9, 13, 23, 59), 2);
    expect(dates[0]).toEqual(local(9, 14, 20, 30));
  });

  it('skips today once its time has passed', () => {
    expect(reminderDates(EVENING, local(9, 14, 21), null, 2)).toEqual([local(9, 15, 20, 30)]);
    // Exactly at the time: already due, not scheduled again
    expect(reminderDates(EVENING, local(9, 14, 20, 30), null, 1)).toEqual([]);
  });

  it('keeps the local time across the end of DST', () => {
    const dates = reminderDates(EVENING, local(9, 31, 9), null, 3);
    expect(dates.map((date) => [date.getDate(), date.getHours(), date.getMinutes()])).toEqual([
      [31, 20, 30],
      [1, 20, 30],
      [2, 20, 30],
    ]);
    // 24 h + 1 h between Oct 31 and Nov 1 evenings
    expect(dates[1].getTime() - dates[0].getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it('a time that does not exist on the spring-forward day still fires that day', () => {
    const dates = reminderDates({ hour: 2, minute: 30 }, local(2, 7, 12), null, 2);
    expect(dates).toHaveLength(1);
    expect(dates[0].getDate()).toBe(8);
  });
});

describe('isReminderTime', () => {
  it('accepts only real times of day', () => {
    expect(isReminderTime({ hour: 0, minute: 0 })).toBe(true);
    expect(isReminderTime({ hour: 23, minute: 59 })).toBe(true);
    for (const bad of [{ hour: 24, minute: 0 }, { hour: 8, minute: 60 }, { hour: 8.5, minute: 0 }, { hour: '8', minute: 0 }, null, 'x']) {
      expect(isReminderTime(bad)).toBe(false);
    }
  });
});
