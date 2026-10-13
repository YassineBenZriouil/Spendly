import { useEffect, useReducer, useRef, useState } from 'react';

import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import type { Expense } from '@/domain/expense/expense.types';
import { haptics } from '@/haptics/haptics.service';

import { canSave, initialQuickAddState, quickAddReducer } from '../state/quickAddReducer';

/** How long "Saved" shows on the button. The next expense can start during it. */
const SAVED_CONFIRMATION_MS = 1200;
const UNDO_WINDOW_MS = 5000;

export function useQuickAdd(currencyCode: string, repository: ExpenseRepository = expenseRepository) {
  const [state, dispatch] = useReducer(quickAddReducer, initialQuickAddState);
  const [undoable, setUndoable] = useState<Expense | null>(null);
  // Synchronous guard: two taps in the same frame both see the old reducer state
  const savingRef = useRef(false);

  useEffect(() => {
    if (state.phase !== 'saved') return;
    const timer = setTimeout(() => dispatch({ type: 'savedAcknowledged' }), SAVED_CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  useEffect(() => {
    if (!undoable) return;
    const timer = setTimeout(() => setUndoable(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [undoable]);

  const save = async () => {
    const { categoryId, amountMinor } = state.draft;
    if (savingRef.current || !canSave(state.draft) || !categoryId) return;
    savingRef.current = true;
    dispatch({ type: 'saveRequested' });
    try {
      const expense = createExpense({ amountMinor, currencyCode, categoryId });
      await repository.save(expense);
      // The composer resets only now, after the record is stored
      dispatch({ type: 'saveSucceeded', expenseId: expense.id });
      setUndoable(expense);
      haptics.success();
    } catch (error) {
      dispatch({ type: 'saveFailed', message: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      savingRef.current = false;
    }
  };

  const undo = async () => {
    if (!undoable) return;
    setUndoable(null);
    try {
      await repository.remove(undoable.id);
    } catch {
      setUndoable(undoable);
    }
  };

  return { state, dispatch, save, undo, undoable };
}
