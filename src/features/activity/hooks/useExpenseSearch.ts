import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { expenseRepository, type ExpenseFilter } from '@/domain/expense/expense.repository';
import type { Expense } from '@/domain/expense/expense.types';

/** Rows that just appeared stay "fresh" this long, so only they play an entering animation. */
const FRESH_MS = 600;

type SearchResult = {
  expenses: Expense[];
  /** Ids not in the previous result (inserted, or newly matching the filter). Empty on first load. */
  freshIds: Set<string>;
};

/** Matching expenses, newest first. Re-queries after every write and when the app returns (day labels may change). */
export function useExpenseSearch({ text, categoryId }: ExpenseFilter) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    let freshTimer: ReturnType<typeof setTimeout> | undefined;

    const load = () => {
      const request = ++latestRequest;
      expenseRepository
        .search({ text, categoryId })
        .then((expenses) => {
          // Ignore out-of-order answers from older requests
          if (!active || request !== latestRequest) return;
          setFailed(false);
          setResult((previous) => {
            const known = new Set(previous?.expenses.map((expense) => expense.id));
            const freshIds = previous
              ? new Set(expenses.filter((expense) => !known.has(expense.id)).map((expense) => expense.id))
              : new Set<string>();
            return { expenses, freshIds };
          });
          clearTimeout(freshTimer);
          freshTimer = setTimeout(() => {
            if (active) setResult((current) => current && { ...current, freshIds: new Set() });
          }, FRESH_MS);
        })
        .catch(() => {
          if (active && request === latestRequest) setFailed(true);
        });
    };

    load();
    const unsubscribe = expenseRepository.subscribe(load);
    const appState = AppState.addEventListener('change', (status) => status === 'active' && load());
    return () => {
      active = false;
      clearTimeout(freshTimer);
      unsubscribe();
      appState.remove();
    };
  }, [text, categoryId, attempt]);

  return { result, failed, retry: () => setAttempt((n) => n + 1) };
}
