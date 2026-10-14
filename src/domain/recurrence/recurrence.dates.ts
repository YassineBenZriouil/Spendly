import type { Frequency } from './recurrence.types';

/** Days in `month` (0-11) of `year`. */
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * When occurrence `index` is due, in local time, always counted from the anchor (never from the previous
 * occurrence), so a rule on the 31st falls on the last day of short months and comes back to the 31st after.
 * Keeps the anchor's time of day across daylight-saving changes.
 */
export function occurrenceDate(anchor: Date, frequency: Frequency, index: number): Date {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const day = anchor.getDate();
  const time = [anchor.getHours(), anchor.getMinutes(), anchor.getSeconds()] as const;
  if (frequency === 'daily' || frequency === 'weekly') {
    return new Date(year, month, day + index * (frequency === 'daily' ? 1 : 7), ...time);
  }
  const months = month + index * (frequency === 'monthly' ? 1 : 12);
  const first = new Date(year, months, 1);
  return new Date(first.getFullYear(), first.getMonth(), Math.min(day, daysInMonth(first.getFullYear(), first.getMonth())), ...time);
}

/** Safety stop for very old daily rules. */
const MAX_OCCURRENCES = 5000;

/**
 * Occurrences due by `now` that are neither handled nor older than `windowStart` (older ones are no longer
 * offered; nothing is saved for them). Oldest first.
 */
export function dueOccurrences(
  anchor: Date,
  frequency: Frequency,
  handled: Set<number>,
  now: Date,
  windowStart: Date,
): { index: number; dueAt: Date }[] {
  const due: { index: number; dueAt: Date }[] = [];
  for (let index = 1; index <= MAX_OCCURRENCES; index++) {
    const dueAt = occurrenceDate(anchor, frequency, index);
    if (dueAt > now) break;
    if (dueAt >= windowStart && !handled.has(index)) due.push({ index, dueAt });
  }
  return due;
}
