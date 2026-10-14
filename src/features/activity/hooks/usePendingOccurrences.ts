import { useEffect, useState } from 'react';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { recurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';
import { useReloadKey } from '@/hooks/useReloadKey';

const RELOAD_ON = [recurrenceRepository, expenseRepository];

/** Repeating expenses waiting for Confirm or Skip, newest first. Refreshed after writes and when the app returns. */
export function usePendingOccurrences(): Occurrence[] {
  const [pending, setPending] = useState<Occurrence[]>([]);
  const reloadKey = useReloadKey(RELOAD_ON);

  useEffect(() => {
    let active = true;
    recurrenceRepository
      .pending()
      .then((occurrences) => active && setPending(occurrences))
      .catch(() => {
        // Keep what is shown; the next write or return to the app retries
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return pending;
}
