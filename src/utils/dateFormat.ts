import { deviceLocale } from '@/domain/money/money.format';

import { startOfLocalDay } from './dates';

const DAY_MS = 86_400_000;

/** Calendar days from `date` to `now` in the device time zone (0 = same day, 1 = yesterday). */
export function localDaysAgo(date: Date, now: Date): number {
  // Rounded: DST days are 23 or 25 hours long
  return Math.round((startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) / DAY_MS);
}

/** "Today", "Yesterday", "Mon, Oct 12", or with the year when it isn't this year. */
export function formatDay(date: Date, now = new Date(), locale = deviceLocale()): string {
  const ago = localDaysAgo(date, now);
  if (ago === 0) return 'Today';
  if (ago === 1) return 'Yesterday';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatTime(date: Date, locale = deviceLocale()): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
}

/** "Today, 14:32" */
export function formatDayTime(date: Date, now = new Date(), locale = deviceLocale()): string {
  return `${formatDay(date, now, locale)}, ${formatTime(date, locale)}`;
}
