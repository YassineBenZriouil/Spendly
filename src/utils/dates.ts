/** A half-open [start, end) range of ISO 8601 UTC timestamps, comparable as strings in SQL. */
export type IsoRange = { start: string; end: string };

/** Midnight at the start of `date`'s day in the device time zone. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Same wall-clock day shifted by `days` (calendar days, so DST days of 23/25 hours are handled). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** The local calendar day containing `date`, as a UTC ISO range. */
export function localDayRange(date: Date): IsoRange {
  const start = startOfLocalDay(date);
  return { start: start.toISOString(), end: addLocalDays(start, 1).toISOString() };
}

/** First day of `date`'s local month. */
export function startOfLocalMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** First day of the month `months` away from `date`'s month. */
export function addLocalMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

/** Local midnight starting `date`'s week. `firstWeekday`: 1 = Sunday … 7 = Saturday (expo-localization's numbering). */
export function startOfLocalWeek(date: Date, firstWeekday: number): Date {
  const back = (date.getDay() - (firstWeekday - 1) + 7) % 7;
  return addLocalDays(date, -back);
}
