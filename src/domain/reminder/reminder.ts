import { addLocalDays, startOfLocalDay } from '@/utils/dates';

/** Local time of day for the daily reminder. */
export type ReminderTime = { hour: number; minute: number };

/**
 * Days scheduled ahead. Several, not one: if the app isn't opened for a few days, the reminder still comes each
 * day. Every launch, return to the app and save schedules them again from scratch.
 */
export const REMINDER_DAYS_AHEAD = 7;

export const isReminderTime = (value: unknown): value is ReminderTime => {
  if (!value || typeof value !== 'object') return false;
  const { hour, minute } = value as Record<string, unknown>;
  return Number.isInteger(hour) && Number.isInteger(minute) && (hour as number) >= 0 && (hour as number) < 24 && (minute as number) >= 0 && (minute as number) < 60;
};

/**
 * When the reminder should fire next: `time` on each of the next `days` local days, starting today. Today is
 * skipped when its time has passed or something was already logged today (`lastLoggedAt` on or after midnight).
 * Local days, so it is right across DST changes; a time that doesn't exist that day (spring forward) moves an hour on.
 */
export function reminderDates(time: ReminderTime, now: Date, lastLoggedAt: Date | null, days = REMINDER_DAYS_AHEAD): Date[] {
  const today = startOfLocalDay(now);
  const loggedToday = lastLoggedAt !== null && lastLoggedAt >= today;
  const dates: Date[] = [];
  for (let offset = 0; offset < days; offset++) {
    if (offset === 0 && loggedToday) continue;
    const at = addLocalDays(today, offset);
    at.setHours(time.hour, time.minute, 0, 0);
    if (at > now) dates.push(at);
  }
  return dates;
}
