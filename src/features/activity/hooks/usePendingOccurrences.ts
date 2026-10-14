import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { recurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';

/** Repeating expenses waiting for Confirm or Skip, newest first. Refreshed after writes and when the app returns. */
export function usePendingOccurrences(): Occurrence[] {
  const [pending, setPending] = useState<Occurrence[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      recurrenceRepository
        .pending()
        .then((occurrences) => active && setPending(occurrences))
        .catch(() => {
          // Keep what is shown; the next write or return to the app retries
        });
    };
    load();
    const unsubscribeRules = recurrenceRepository.subscribe(load);
    const unsubscribeExpenses = expenseRepository.subscribe(load);
    const appState = AppState.addEventListener('change', (status) => status === 'active' && load());
    return () => {
      active = false;
      unsubscribeRules();
      unsubscribeExpenses();
      appState.remove();
    };
  }, []);

  return pending;
}
