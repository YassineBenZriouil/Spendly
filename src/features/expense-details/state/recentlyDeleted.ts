import type { Expense } from '@/domain/expense/expense.types';

let current: Expense | null = null;
const listeners = new Set<() => void>();

/**
 * The expense just deleted from the edit screen, so Activity (where the user lands after the pop) can offer Undo.
 * In memory only: Undo is a short-lived affordance, not data.
 */
export const recentlyDeleted = {
  get: () => current,
  set(expense: Expense | null) {
    current = expense;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
