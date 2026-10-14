import { currencyExponent } from '@/domain/money/money.format';
import { addLocalDays, startOfLocalDay, type IsoRange } from '@/utils/dates';

import { BASELINE_PERIODS, type PeriodSpend } from './highlights';

import type { CategorySpend, InsightsRepository } from './insights.repository';
import { comparisonRange, dayRange, elapsedDays, periodFor, periodRange, type Period, type PeriodKind } from './period';

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
  days: { day: Date; totalMinor: number; state: DayState }[];
  /** False when nothing was ever recorded: an empty state, not a chart of zeros. */
  hasAnyData: boolean;
  /** The period still running (offset 0). */
  isCurrent: boolean;
  /**
   * Earlier periods for "usual" (most recent first, up to 8): each cut to as many days as this one has had, and only
   * periods that started after tracking began, so a half-tracked first period never drags the baseline down.
   */
  baseline: PeriodSpend[];
  /** Smallest change in this currency worth mentioning (see `highlights.ts`). */
  minimumMinor: number;
  /** Income in this currency during the period: Net is shown only when it is above 0. */
  incomeMinor: number;
};

/**
 * 10 major units (10 €, 10 $, 10 MAD); 1,000 for currencies without decimals (JPY, KRW), whose units are tiny.
 * shortcut: one rule by currency exponent, not by real value; use a per-currency table if users find it off.
 */
export function notableMinimumMinor(currencyCode: string): number {
  const exponent = currencyExponent(currencyCode);
  return exponent === 0 ? 1000 : 10 * Math.pow(10, exponent);
}

/** Up to BASELINE_PERIODS earlier windows of the same length as `period` so far. */
export function baselineWindows(period: Period, now: Date, firstWeekday: number, firstDay: Date | null): IsoRange[] {
  if (!firstDay) return [];
  const length = Math.max(elapsedDays(period, now), 1);
  const windows: IsoRange[] = [];
  for (let back = 1; back <= BASELINE_PERIODS; back++) {
    const earlier = periodFor(period.kind, -back, period.start, firstWeekday);
    if (earlier.start < firstDay) break;
    const days = Math.min(length, earlier.days.length);
    windows.push({ start: earlier.start.toISOString(), end: addLocalDays(earlier.start, days).toISOString() });
  }
  return windows;
}

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
  const [byCategory, daily, previous, incomeMinor] = await Promise.all([
    repository.byCategory(periodRange(period), currencyCode),
    repository.daily(period.days.map(dayRange), currencyCode),
    repository.totalsByCurrency(comparison),
    repository.incomeTotal(periodRange(period), currencyCode),
  ]);

  const firstDay = firstAt ? startOfLocalDay(new Date(firstAt)) : null;
  const today = startOfLocalDay(now);
  const baseline = await Promise.all(
    baselineWindows(period, now, firstWeekday, firstDay).map(async (window) => {
      const spend = await repository.byCategory(window, currencyCode);
      return { totalMinor: spend.reduce((sum, item) => sum + item.totalMinor, 0), byCategory: spend };
    }),
  );
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
    days: period.days.map((day, index) => ({
      day,
      totalMinor: daily[index],
      state: daily[index] > 0 ? 'spent' : !firstDay || day < firstDay || day > today ? 'noData' : 'zero',
    })),
    hasAnyData: firstAt !== null,
    isCurrent: offset === 0,
    baseline,
    minimumMinor: notableMinimumMinor(currencyCode),
    incomeMinor,
  };
}
