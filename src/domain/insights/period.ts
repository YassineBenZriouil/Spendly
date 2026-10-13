import { addLocalDays, addLocalMonths, startOfLocalDay, startOfLocalMonth, startOfLocalWeek, type IsoRange } from '@/utils/dates';

export type PeriodKind = 'week' | 'month';

export type Period = {
  kind: PeriodKind;
  /** Local midnight the period starts on. */
  start: Date;
  /** Local midnight after the last day (exclusive). */
  end: Date;
  /** Local midnight of every day in the period. */
  days: Date[];
};

/** The week or month containing `now`, shifted by `offset` periods (0 = current, -1 = previous, …). */
export function periodFor(kind: PeriodKind, offset: number, now: Date, firstWeekday: number): Period {
  const start =
    kind === 'week'
      ? addLocalDays(startOfLocalWeek(now, firstWeekday), offset * 7)
      : addLocalMonths(startOfLocalMonth(now), offset);
  const end = kind === 'week' ? addLocalDays(start, 7) : addLocalMonths(start, 1);
  const days: Date[] = [];
  for (let day = start; day < end; day = addLocalDays(day, 1)) days.push(day);
  return { kind, start, end, days };
}

export function periodRange(period: Period): IsoRange {
  return { start: period.start.toISOString(), end: period.end.toISOString() };
}

export function dayRange(day: Date): IsoRange {
  return { start: day.toISOString(), end: addLocalDays(day, 1).toISOString() };
}

/**
 * How many days of the period count for a fair comparison: the elapsed days (today included) for the
 * current period, every day for a past one.
 */
export function elapsedDays(period: Period, now: Date): number {
  const today = startOfLocalDay(now);
  return period.days.filter((day) => day <= today).length;
}

/** The previous period, cut to the same number of days, so "so far this week" is compared with "same days last week". */
export function comparisonRange(period: Period, now: Date, firstWeekday: number): IsoRange {
  const previous = periodFor(period.kind, -1, period.start, firstWeekday);
  const days = Math.min(Math.max(elapsedDays(period, now), 1), previous.days.length);
  return { start: previous.start.toISOString(), end: addLocalDays(previous.start, days).toISOString() };
}
