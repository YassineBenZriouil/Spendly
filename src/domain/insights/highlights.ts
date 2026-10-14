import { formatMoney } from '@/domain/money/money.format';

import type { CategorySpend } from './insights.repository';
import type { PeriodKind } from './period';

/*
 * Highlights: at most 3 plain-language sentences about what's different (PHASES-2, Phase 5).
 * - "Usual" = the median of up to 8 earlier periods, each cut to the same number of days as this one.
 * - Nothing is called unusual until there are at least 4 such periods.
 * - A change counts only if it is both ≥ 30% and ≥ a currency-aware minimum, so 2 € → 4 € is never "up 100%".
 * - If nothing is notable, it says so instead of inventing a story.
 */

export const BASELINE_PERIODS = 8;
export const MIN_BASELINE_PERIODS = 4;
export const NOTABLE_CHANGE = 0.3;
export const MAX_HIGHLIGHTS = 3;
/** A single day is worth pointing out when it holds this share of the period's spending. */
const BIG_DAY_SHARE = 0.4;
/** A category is "most frequent" when it has this share of the expenses (and at least MIN_FREQUENT of them). */
const FREQUENT_SHARE = 0.4;
const MIN_FREQUENT = 3;

export type HighlightKind = 'totalUp' | 'totalDown' | 'categoryUp' | 'categoryDown' | 'missing' | 'biggestDay' | 'frequent' | 'normal' | 'learning';

export type Highlight = {
  /** Stable key (also used for ordering ties). */
  id: string;
  kind: HighlightKind;
  /** Shown and spoken as is. */
  text: string;
  /** Set when the highlight is about one category: tapping it opens those expenses. */
  categoryId?: string;
};

/** Spending in one period window (the current one, or an earlier one used for the baseline). */
export type PeriodSpend = { totalMinor: number; byCategory: CategorySpend[] };

export type Change = { direction: 'up' | 'down' | 'same'; percent: number };

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

/** Whether `current` differs from `usual` enough to mention: both relatively and in money. */
export function isNotableChange(currentMinor: number, usualMinor: number, minimumMinor: number): boolean {
  if (usualMinor <= 0) return false;
  const difference = Math.abs(currentMinor - usualMinor);
  return difference >= minimumMinor && difference / usualMinor >= NOTABLE_CHANGE;
}

/** Up / down / about the same compared with usual; null when there is no usual to compare with. */
export function changeVsUsual(currentMinor: number, usualMinor: number, minimumMinor: number): Change | null {
  if (usualMinor <= 0) return null;
  const percent = Math.round((Math.abs(currentMinor - usualMinor) / usualMinor) * 100);
  if (!isNotableChange(currentMinor, usualMinor, minimumMinor)) return { direction: 'same', percent };
  return { direction: currentMinor > usualMinor ? 'up' : 'down', percent };
}

/** The usual amount per category: median over the baseline, counting absent as 0. */
export function usualByCategory(baseline: PeriodSpend[]): Map<string, number> {
  const ids = new Set(baseline.flatMap((period) => period.byCategory.map((item) => item.categoryId)));
  const usual = new Map<string, number>();
  for (const id of ids) {
    usual.set(id, median(baseline.map((period) => period.byCategory.find((item) => item.categoryId === id)?.totalMinor ?? 0)));
  }
  return usual;
}

export type HighlightInput = {
  kind: PeriodKind;
  currencyCode: string;
  /** The period still running ("this week") or a past one ("that week"). */
  isCurrent: boolean;
  current: PeriodSpend;
  /** Earlier, fully tracked periods cut to the same length, most recent first (at most BASELINE_PERIODS). */
  baseline: PeriodSpend[];
  days: { day: Date; totalMinor: number }[];
  /** Smallest amount (minor units) worth calling a change. */
  minimumMinor: number;
  categoryName: (categoryId: string) => string;
  dayName: (day: Date) => string;
};

/** `tier`: what's different from usual (1) always ranks above plain facts (0); then larger amounts first. */
type Candidate = Highlight & { tier: number; score: number };

export function buildHighlights(input: HighlightInput): Highlight[] {
  const { kind, currencyCode, isCurrent, current, baseline, days, minimumMinor, categoryName, dayName } = input;
  const money = (amountMinor: number) => formatMoney(amountMinor, currencyCode);
  const thisPeriod = `${isCurrent ? 'this' : 'that'} ${kind}`;
  const enoughHistory = baseline.length >= MIN_BASELINE_PERIODS;
  const candidates: Candidate[] = [];

  if (enoughHistory) {
    // Overall spending compared with a usual period (only when something was spent: "100% less" says nothing)
    const usualTotal = median(baseline.map((period) => period.totalMinor));
    if (current.totalMinor > 0 && isNotableChange(current.totalMinor, usualTotal, minimumMinor)) {
      const change = changeVsUsual(current.totalMinor, usualTotal, minimumMinor)!;
      const up = change.direction === 'up';
      candidates.push({
        id: 'total',
        kind: up ? 'totalUp' : 'totalDown',
        text: `${isCurrent ? "You've spent" : 'You spent'} ${change.percent}% ${up ? 'more' : 'less'} than in a usual ${kind}`,
        tier: 1,
        score: Math.abs(current.totalMinor - usualTotal) * 1.2,
      });
    }

    const usual = usualByCategory(baseline);
    for (const [categoryId, usualMinor] of usual) {
      const spent = current.byCategory.find((item) => item.categoryId === categoryId)?.totalMinor ?? 0;
      const name = categoryName(categoryId);
      if (spent === 0) {
        // Usually spent on by this point, nothing this time
        if (usualMinor >= minimumMinor) {
          candidates.push({
            id: `missing:${categoryId}`,
            kind: 'missing',
            categoryId,
            text: `${isCurrent ? "You haven't spent" : "You didn't spend"} on ${name} ${thisPeriod}`,
            tier: 1,
            score: usualMinor,
          });
        }
      } else if (isNotableChange(spent, usualMinor, minimumMinor)) {
        const change = changeVsUsual(spent, usualMinor, minimumMinor)!;
        const up = change.direction === 'up';
        candidates.push({
          id: `category:${categoryId}`,
          kind: up ? 'categoryUp' : 'categoryDown',
          categoryId,
          text: `${name} ${isCurrent ? 'is' : 'was'} ${up ? 'up' : 'down'} ${change.percent}% compared with your usual ${kind}`,
          tier: 1,
          score: Math.abs(spent - usualMinor),
        });
      }
    }
  }

  // Facts that need no history
  const spentDays = days.filter((day) => day.totalMinor > 0);
  const biggest = spentDays.reduce<{ day: Date; totalMinor: number } | null>(
    (best, day) => (!best || day.totalMinor > best.totalMinor ? day : best),
    null,
  );
  if (
    biggest &&
    spentDays.length >= 2 &&
    biggest.totalMinor >= minimumMinor &&
    biggest.totalMinor >= current.totalMinor * BIG_DAY_SHARE
  ) {
    candidates.push({
      id: 'biggestDay',
      kind: 'biggestDay',
      text: `Biggest day: ${dayName(biggest.day)}, ${money(biggest.totalMinor)}`,
      tier: 0,
      score: biggest.totalMinor,
    });
  }

  const expenseCount = current.byCategory.reduce((sum, item) => sum + item.count, 0);
  const frequent = current.byCategory.reduce<CategorySpend | null>(
    (best, item) => (!best || item.count > best.count || (item.count === best.count && item.totalMinor > best.totalMinor) ? item : best),
    null,
  );
  if (frequent && frequent.count >= MIN_FREQUENT && frequent.count >= expenseCount * FREQUENT_SHARE) {
    candidates.push({
      id: `frequent:${frequent.categoryId}`,
      kind: 'frequent',
      categoryId: frequent.categoryId,
      text: `${categoryName(frequent.categoryId)} ${isCurrent ? 'is' : 'was'} your most frequent category (${frequent.count} expenses)`,
      tier: 0,
      score: 0,
    });
  }

  const ranked = candidates
    .sort((a, b) => b.tier - a.tier || b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, MAX_HIGHLIGHTS)
    .map(({ id, kind: highlightKind, text, categoryId }): Highlight => ({ id, kind: highlightKind, text, ...(categoryId ? { categoryId } : {}) }));
  if (ranked.length > 0) return ranked;

  return [
    enoughHistory
      ? { id: 'normal', kind: 'normal', text: `A normal ${kind}: nothing stands out` }
      : { id: 'learning', kind: 'learning', text: `After a few ${kind}s of history, Spendly will point out what's unusual` },
  ];
}
