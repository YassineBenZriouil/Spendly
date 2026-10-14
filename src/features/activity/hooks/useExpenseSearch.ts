import { useEffect, useState } from 'react';

import { expenseRepository, type ExpenseFilter } from '@/domain/expense/expense.repository';
import { useReloadKey } from '@/hooks/useReloadKey';

import { nextSearchResult, type SearchResult } from '../utils/nextSearchResult';

/** Rows that just appeared stay "fresh" this long, so only they play an entering animation. */
const FRESH_MS = 600;
const RELOAD_ON = [expenseRepository];

/** Matching expenses, newest first. Re-queries after every write and when the app returns (day labels may change). */
export function useExpenseSearch({ text, categoryId }: ExpenseFilter) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reloadKey = useReloadKey(RELOAD_ON);

  useEffect(() => {
    let active = true;
    let freshTimer: ReturnType<typeof setTimeout> | undefined;
    const filterKey = JSON.stringify([text ?? '', categoryId ?? null]);

    expenseRepository
      .search({ text, categoryId })
      .then((expenses) => {
        // A newer filter or reload has taken over
        if (!active) return;
        setFailed(false);
        setResult((previous) => nextSearchResult(previous, expenses, filterKey));
        // Stop marking rows fresh, so the same rows don't animate again when scrolled back into view
        freshTimer = setTimeout(() => {
          if (active) setResult((current) => (current && current.freshIds.size ? { ...current, freshIds: new Set() } : current));
        }, FRESH_MS);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      clearTimeout(freshTimer);
    };
  }, [text, categoryId, attempt, reloadKey]);

  return { result, failed, retry: () => setAttempt((n) => n + 1) };
}
