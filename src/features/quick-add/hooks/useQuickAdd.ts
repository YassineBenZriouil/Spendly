import { useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { haptics } from '@/haptics/haptics.service';
import { getPreferences, updatePreferences } from '@/storage/preferences/preferences';

import { loadDraft, saveDraft } from '../state/draftStorage';
import { canSave, initialQuickAddState, quickAddReducer, restoreDraft } from '../state/quickAddReducer';

/** How long "Saved" shows on the button. The next expense can start during it. */
const SAVED_CONFIRMATION_MS = 1200;
const UNDO_WINDOW_MS = 5000;

export function useQuickAdd(currencyCode: string, repository: ExpenseRepository = expenseRepository) {
  const [state, dispatch] = useReducer(quickAddReducer, initialQuickAddState, (initial) => {
    const draft = loadDraft();
    if (draft) return restoreDraft(draft);
    // "Last used" default: start with the previous category already selected
    const { defaultCategoryMode, lastUsedCategoryId } = getPreferences();
    return defaultCategoryMode === 'lastUsed' && lastUsedCategoryId
      ? restoreDraft({ categoryId: lastUsedCategoryId, amountMinor: 0 })
      : initial;
  });
  const [undoable, setUndoable] = useState<Expense | null>(null);
  // Synchronous guard: two taps in the same frame both see the old reducer state
  const savingRef = useRef(false);

  // Keep the unsaved draft on disk so it survives backgrounding and the app being killed
  const { draft } = state;
  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

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
    const { categoryId, amountMinor, details } = state.draft;
    if (savingRef.current || !canSave(state.draft) || !categoryId) return;
    savingRef.current = true;
    dispatch({ type: 'saveRequested' });
    try {
      const expense = createExpense({ ...details, amountMinor, currencyCode, categoryId });
      await repository.save(expense);
      // The composer resets only now, after the record is stored
      updatePreferences({ lastUsedCategoryId: categoryId });
      const keepCategoryId = getPreferences().defaultCategoryMode === 'lastUsed' ? categoryId : undefined;
      dispatch({ type: 'saveSucceeded', expenseId: expense.id, keepCategoryId });
      setUndoable(expense);
      haptics.success();
      // iOS has no live regions: say it out loud for VoiceOver
      AccessibilityInfo.announceForAccessibility(`Saved ${formatMoney(amountMinor, currencyCode)}. Undo is available.`);
    } catch (error) {
      dispatch({ type: 'saveFailed', message: error instanceof Error ? error.message : 'Unknown error' });
      AccessibilityInfo.announceForAccessibility("Couldn't save. Your entry is still here.");
    } finally {
      savingRef.current = false;
    }
  };

  const undo = async () => {
    if (!undoable) return;
    setUndoable(null);
    try {
      await repository.remove(undoable.id);
      AccessibilityInfo.announceForAccessibility('Expense removed');
    } catch {
      setUndoable(undoable);
    }
  };

  return { state, dispatch, save, undo, undoable };
}
