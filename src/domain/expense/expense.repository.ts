import type { Expense } from './expense.types';

/** Persistence boundary for expenses. Phase 2 swaps the in-memory version for SQLite. */
export type ExpenseRepository = {
  /** Idempotent: saving the same id twice keeps one record. */
  save(expense: Expense): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<Expense[]>;
};

export function createInMemoryExpenseRepository(): ExpenseRepository {
  const expenses = new Map<string, Expense>();
  return {
    async save(expense) {
      expenses.set(expense.id, expense);
    },
    async remove(id) {
      expenses.delete(id);
    },
    async list() {
      return [...expenses.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    },
  };
}

// shortcut: in-memory, data is lost on restart; replaced by the SQLite repository in Phase 2
export const expenseRepository = createInMemoryExpenseRepository();
