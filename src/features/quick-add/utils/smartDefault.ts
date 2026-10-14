import type { CategoryTime } from '@/domain/expense/expense.repository';

/** How far back to look, and what counts as "the same time of day". */
export const SMART_DEFAULT_HISTORY_DAYS = 60;
const WINDOW_MINUTES = 90;
/** Fewer entries than this at the current time of day is not a habit yet. */
const MIN_ENTRIES = 5;
/** The category must have been chosen in at least this share of those entries. */
const MIN_SHARE = 0.6;

const MINUTES_PER_DAY = 24 * 60;

const minuteOfDay = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Distance between two local times of day, wrapping around midnight. */
function minutesApart(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, MINUTES_PER_DAY - diff);
}

/**
 * The category to preselect now: the one chosen in at least 60% of the (5 or more) expenses logged within 90 minutes
 * of the current local time of day. `null` when there is no clear habit, or when that category can't be picked.
 */
export function smartDefaultCategory(
  entries: CategoryTime[],
  now: Date,
  isSelectable: (categoryId: string) => boolean,
): string | null {
  const nowMinute = minuteOfDay(now);
  const counts = new Map<string, number>();
  let total = 0;
  for (const entry of entries) {
    if (minutesApart(minuteOfDay(new Date(entry.occurredAt)), nowMinute) > WINDOW_MINUTES) continue;
    counts.set(entry.categoryId, (counts.get(entry.categoryId) ?? 0) + 1);
    total += 1;
  }
  if (total < MIN_ENTRIES) return null;

  let best: string | null = null;
  let bestCount = 0;
  for (const [categoryId, count] of counts) {
    if (count > bestCount) [best, bestCount] = [categoryId, count];
  }
  return best && bestCount / total >= MIN_SHARE && isSelectable(best) ? best : null;
}
