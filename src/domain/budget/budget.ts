/**
 * Monthly budgets, in one currency (the main currency when they were set). Only shown in Insights, never as alerts.
 * `monthlyMinor`: the overall amount (optional); `byCategory`: optional amounts per category id.
 */
export type Budget = { currencyCode: string; monthlyMinor?: number; byCategory: Record<string, number> };

export type BudgetProgress = {
  budgetMinor: number;
  spentMinor: number;
  /** Budget minus spending: negative when over. */
  remainingMinor: number;
  /** Spent / budget (can exceed 1). */
  ratio: number;
  over: boolean;
};

export function budgetProgress(spentMinor: number, budgetMinor: number): BudgetProgress {
  return {
    budgetMinor,
    spentMinor,
    remainingMinor: budgetMinor - spentMinor,
    ratio: budgetMinor > 0 ? spentMinor / budgetMinor : 0,
    over: spentMinor > budgetMinor,
  };
}

const isAmount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** A budget read back from storage or a backup, or null if anything about it is wrong. Empty budgets are null. */
export function parseBudget(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(v.currencyCode)) return null;
  if (v.monthlyMinor !== undefined && !isAmount(v.monthlyMinor)) return null;
  if (!v.byCategory || typeof v.byCategory !== 'object') return null;
  const entries = Object.entries(v.byCategory as Record<string, unknown>);
  if (!entries.every(([id, amount]) => id.length > 0 && isAmount(amount))) return null;
  if (v.monthlyMinor === undefined && entries.length === 0) return null;
  return {
    currencyCode: v.currencyCode,
    ...(v.monthlyMinor !== undefined ? { monthlyMinor: v.monthlyMinor } : {}),
    byCategory: Object.fromEntries(entries) as Record<string, number>,
  };
}
