import { getCalendars } from 'expo-localization';

import { deviceLocale } from '@/domain/money/money.format';
import { t } from '@/i18n';

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
  if (ago === 0) return t('expense.date.today');
  if (ago === 1) return t('expense.date.yesterday');
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
  return t('expense.date.dayTime', { day: formatDay(date, now, locale), time: formatTime(date, locale) });
}

/** First day of the week for the device locale: 1 = Sunday … 7 = Saturday. */
export function deviceFirstWeekday(): number {
  return getCalendars()[0]?.firstWeekday ?? 1;
}

/** "Oct 12 – 18" style label for a date range (end inclusive). */
export function formatDayRange(start: Date, endInclusive: Date, locale = deviceLocale()): string {
  const format = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  return `${format.format(start)} – ${format.format(endInclusive)}`;
}

/** "Saturday, March 8": a day named in full, without "today" / "yesterday" (recaps, shared images). */
export function formatFullDay(date: Date, locale = deviceLocale()): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export function formatMonth(date: Date, locale = deviceLocale()): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}
