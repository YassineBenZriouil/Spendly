import { useEffect, useState } from 'react';

import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';

const HISTORY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Amounts the user most often logs for the selected category. Loaded once per selection, so the list never
 * reorders while it is on screen.
 */
export function useAmountSuggestions(
  categoryId: string | null,
  currencyCode: string,
  repository: ExpenseRepository = expenseRepository,
): number[] {
  const [loaded, setLoaded] = useState<{ key: string; amounts: number[] } | null>(null);
  const key = categoryId ? `${categoryId}:${currencyCode}` : null;

  useEffect(() => {
    if (!categoryId) return;
    let active = true;
    const since = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString();
    repository
      .amountSuggestions(categoryId, currencyCode, since)
      .then((amounts) => active && setLoaded({ key: `${categoryId}:${currencyCode}`, amounts }))
      .catch(() => {
        // Suggestions are optional: dragging still works
      });
    return () => {
      active = false;
    };
  }, [categoryId, currencyCode, repository]);

  return loaded && loaded.key === key ? loaded.amounts : [];
}
