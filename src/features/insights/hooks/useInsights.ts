import { useEffect, useState } from 'react';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { insightsRepository } from '@/domain/insights/insights.repository';
import { loadInsights, type Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { useReloadKey } from '@/hooks/useReloadKey';
import { deviceFirstWeekday } from '@/utils/dateFormat';
import { localDayRange } from '@/utils/dates';

const RELOAD_ON = [expenseRepository];

/** Results per period and currency, so going back and forth between periods is instant. Any write empties it. */
const cache = new Map<string, Insights>();
/** Bumped by every write, so a load that a write overtook is not cached. */
let generation = 0;
expenseRepository.subscribe(() => {
  generation++;
  cache.clear();
});

/** Insights for one period, re-queried after every expense write and when the app returns (the day may have changed). */
export function useInsights(kind: PeriodKind, offset: number, preferredCurrency: string, enabled = true) {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reloadKey = useReloadKey(RELOAD_ON);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const firstWeekday = deviceFirstWeekday();
    // The day is part of the key: the current period changes at midnight
    const key = [kind, offset, preferredCurrency, firstWeekday, localDayRange(new Date()).start].join('|');
    const cached = attempt === 0 ? cache.get(key) : undefined;
    const startedAt = generation;
    (cached ? Promise.resolve(cached) : loadInsights(insightsRepository, { kind, offset, preferredCurrency, firstWeekday }))
      .then((next) => {
        if (startedAt === generation) cache.set(key, next);
        if (!active) return;
        setFailed(false);
        setInsights(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [kind, offset, preferredCurrency, attempt, reloadKey, enabled]);

  return { insights, failed, retry: () => setAttempt((n) => n + 1) };
}
