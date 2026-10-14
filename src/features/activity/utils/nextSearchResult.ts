import type { Expense } from '@/domain/expense/expense.types';

/** More rows added or removed than this at once is a bulk change: the list cross-fades as a whole. */
export const ROW_ANIMATION_LIMIT = 5;

export type SearchResult = {
  expenses: Expense[];
  /** Ids added by a small write since the previous result: only these play an entering animation. */
  freshIds: Set<string>;
  /** The filter this result answers. */
  filterKey: string;
  /** Changes on a new filter or a bulk change, so the list is replaced (one cross-fade) instead of animating rows. */
  listKey: number;
};

const NONE = new Set<string>();

/** The next search result, compared with the one on screen. Pure, so the bulk / small-write rule is tested. */
export function nextSearchResult(previous: SearchResult | null, expenses: Expense[], filterKey: string): SearchResult {
  if (!previous || previous.filterKey !== filterKey) {
    return { expenses, freshIds: NONE, filterKey, listKey: (previous?.listKey ?? 0) + 1 };
  }
  const known = new Set(previous.expenses.map((expense) => expense.id));
  const added = expenses.filter((expense) => !known.has(expense.id)).map((expense) => expense.id);
  const removed = previous.expenses.length - (expenses.length - added.length);
  if (added.length + removed > ROW_ANIMATION_LIMIT) {
    return { expenses, freshIds: NONE, filterKey, listKey: previous.listKey + 1 };
  }
  return { expenses, freshIds: added.length ? new Set(added) : NONE, filterKey, listKey: previous.listKey };
}
