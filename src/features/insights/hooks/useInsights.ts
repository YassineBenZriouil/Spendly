import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { insightsRepository } from '@/domain/insights/insights.repository';
import { loadInsights, type Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { deviceFirstWeekday } from '@/utils/dateFormat';

/** Insights for one period, re-queried after every expense write and when the app returns (the day may have changed). */
export function useInsights(kind: PeriodKind, offset: number, preferredCurrency: string) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    const load = () => {
      const request = ++latestRequest;
      loadInsights(insightsRepository, { kind, offset, preferredCurrency, firstWeekday: deviceFirstWeekday() })
        .then((next) => {
          if (!active || request !== latestRequest) return;
          setFailed(false);
          setInsights(next);
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
      unsubscribe();
      appState.remove();
    };
  }, [kind, offset, preferredCurrency, attempt]);

  return { insights, failed, retry: () => setAttempt((n) => n + 1) };
}
