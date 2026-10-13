import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { expenseRepository, type CurrencyTotal } from '@/domain/expense/expense.repository';
import { localDayRange } from '@/utils/dates';

/** Today's spending per currency. Refreshes after every write and when the app returns (the day may have changed). */
export function useTodayTotal() {
  const [totals, setTotals] = useState<CurrencyTotal[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      expenseRepository
        .totalsBetween(localDayRange(new Date()))
        .then((next) => active && setTotals(next))
        .catch(() => {
          // Low-priority display; keep the last known value
        });
    };

    refresh();
    const unsubscribe = expenseRepository.subscribe(refresh);
    const appState = AppState.addEventListener('change', (status) => status === 'active' && refresh());
    return () => {
      active = false;
      unsubscribe();
      appState.remove();
    };
  }, []);

  return totals;
}
