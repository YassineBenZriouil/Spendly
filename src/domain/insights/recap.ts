import { changeVsUsual, median, MIN_BASELINE_PERIODS, type Change } from './highlights';
import type { Insights } from './insights.service';
import type { CategorySpend } from './insights.repository';

/** The recap card shows for the month that just ended during these first days of the new one. */
export const RECAP_DAYS = 7;

export type Recap = {
  /** First day of the recapped month (local midnight). */
  month: Date;
  currencyCode: string;
  totalMinor: number;
  count: number;
  /** Where most of the money went. */
  topCategory: CategorySpend;
  /** The day with the most spending. */
  biggestDay: { day: Date; totalMinor: number };
  /** Compared with a usual month (same rules as the highlights); null until there are enough earlier months. */
  change: Change | null;
};

/**
 * A finished month's recap, from that month's Insights (month view, a past offset). Null when nothing was spent: a
 * recap of nothing says nothing. Months have different lengths; "usual" is the median of earlier months, each cut to
 * this one's length (the Insights baseline), so February isn't always "less than usual".
 */
export function buildRecap(insights: Insights): Recap | null {
  if (insights.period.kind !== 'month' || insights.isCurrent || insights.totalMinor <= 0) return null;
  const topCategory = insights.byCategory[0];
  const biggestDay = insights.days.reduce((best, day) => (day.totalMinor > best.totalMinor ? day : best));
  const enoughHistory = insights.baseline.length >= MIN_BASELINE_PERIODS;
  const usual = median(insights.baseline.map((period) => period.totalMinor));
  return {
    month: insights.period.start,
    currencyCode: insights.currencyCode,
    totalMinor: insights.totalMinor,
    count: insights.count,
    topCategory,
    biggestDay: { day: biggestDay.day, totalMinor: biggestDay.totalMinor },
    change: enoughHistory ? changeVsUsual(insights.totalMinor, usual, insights.minimumMinor) : null,
  };
}

/** Stable key of a month ("2026-10"), e.g. to remember which recap was dismissed. */
export const monthKey = (month: Date) => `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
