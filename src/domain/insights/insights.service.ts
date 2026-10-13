import { startOfLocalDay } from '@/utils/dates';

import type { CategorySpend, InsightsRepository } from './insights.repository';
import { comparisonRange, dayRange, periodFor, periodRange, type Period, type PeriodKind } from './period';

/** spent: money went out · zero: tracked day, nothing spent · noData: before the first expense or still to come. */
export type DayState = 'spent' | 'zero' | 'noData';

export type Insights = {
  period: Period;
  /** Currencies with spending in this period (largest first). */
  currencies: string[];
  /** The currency every number below is in. */
  currencyCode: string;
  totalMinor: number;
  count: number;
  /** Previous period over the same number of days; null when there was no data back then. */
  previousTotalMinor: number | null;
  byCategory: CategorySpend[];
  /** Most expenses; ties go to the larger total. */
  mostFrequent: CategorySpend | null;
  days: { day: Date; totalMinor: number; state: DayState }[];
  /** False when nothing was ever recorded: an empty state, not a chart of zeros. */
  hasAnyData: boolean;
};

type InsightsRequest = {
  kind: PeriodKind;
  offset: number;
  /** Shown if it has spending in the period; otherwise the largest currency there. */
  preferredCurrency: string;
  firstWeekday: number;
  now?: Date;
};

export async function loadInsights(
  repository: InsightsRepository,
  { kind, offset, preferredCurrency, firstWeekday, now = new Date() }: InsightsRequest,
): Promise<Insights> {
  const period = periodFor(kind, offset, now, firstWeekday);
  const [totals, firstAt] = await Promise.all([
    repository.totalsByCurrency(periodRange(period)),
    repository.firstExpenseAt(),
  ]);

  const currencies = totals.map((total) => total.currencyCode);
  const currencyCode = currencies.includes(preferredCurrency) ? preferredCurrency : (currencies[0] ?? preferredCurrency);
  const current = totals.find((total) => total.currencyCode === currencyCode);

  const comparison = comparisonRange(period, now, firstWeekday);
  const [byCategory, daily, previous] = await Promise.all([
    repository.byCategory(periodRange(period), currencyCode),
    repository.daily(period.days.map(dayRange), currencyCode),
    repository.totalsByCurrency(comparison),
  ]);

  const firstDay = firstAt ? startOfLocalDay(new Date(firstAt)) : null;
  const today = startOfLocalDay(now);
  const hadDataBefore = firstAt !== null && firstAt < comparison.end;

  return {
    period,
    currencies,
    currencyCode,
    totalMinor: current?.totalMinor ?? 0,
    count: current?.count ?? 0,
    previousTotalMinor: hadDataBefore
      ? (previous.find((total) => total.currencyCode === currencyCode)?.totalMinor ?? 0)
      : null,
    byCategory,
    mostFrequent: byCategory.reduce<CategorySpend | null>(
      (best, item) =>
        !best || item.count > best.count || (item.count === best.count && item.totalMinor > best.totalMinor)
          ? item
          : best,
      null,
    ),
    days: period.days.map((day, index) => ({
      day,
      totalMinor: daily[index],
      state: daily[index] > 0 ? 'spent' : !firstDay || day < firstDay || day > today ? 'noData' : 'zero',
    })),
    hasAnyData: firstAt !== null,
  };
}
