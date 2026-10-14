import { useEffect, useState } from 'react';

import { expenseRepository, type CurrencyTotal } from '@/domain/expense/expense.repository';
import { useReloadKey } from '@/hooks/useReloadKey';
import { localDayRange } from '@/utils/dates';

const RELOAD_ON = [expenseRepository];

/** Today's spending per currency. Refreshes after every write and when the app returns (the day may have changed). */
export function useTodayTotal() {
  const [totals, setTotals] = useState<CurrencyTotal[]>([]);
  const reloadKey = useReloadKey(RELOAD_ON);

  useEffect(() => {
    let active = true;
    expenseRepository
      .totalsBetween(localDayRange(new Date()))
      .then((next) => active && setTotals(next))
      .catch(() => {
        // Low-priority display; keep the last known value
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return totals;
}
