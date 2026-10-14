import { useEffect, useReducer, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { categoryRepository } from '@/domain/category/category.repository';
import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';
import { createExpense } from '@/domain/expense/expense.service';
import { formatMoney } from '@/domain/money/money.format';
import { useUndo } from '@/features/undo/hooks/useUndo';
import { undoStore } from '@/features/undo/state/undoStore';
import { haptics } from '@/haptics/haptics.service';
import { writeFailureMessage } from '@/storage/database/errors';
import { createId } from '@/utils/ids';
import { t } from '@/i18n';

import { loadDraft, loadPendingExpenseId, saveDraft } from '../state/draftStorage';
import {
  canSave,
  initialQuickAddState,
  quickAddReducer,
  restoreDraft,
  type QuickAddDraft,
  type QuickAddEvent,
} from '../state/quickAddReducer';
import { SMART_DEFAULT_HISTORY_DAYS, smartDefaultCategory } from '../utils/smartDefault';

/** How long "Saved" shows on the button. The next expense can start during it. */
const SAVED_CONFIRMATION_MS = 1200;
const DAY_MS = 24 * 60 * 60 * 1000;

const isUntouched = ({ categoryId, amountMinor, details = {} }: QuickAddDraft) =>
  categoryId === null && amountMinor === 0 && !Object.values(details).some(Boolean);

export function useQuickAdd(currencyCode: string, repository: ExpenseRepository = expenseRepository) {
  const [state, dispatch] = useReducer(quickAddReducer, initialQuickAddState, (initial) => {
    const draft = loadDraft();
    return draft ? restoreDraft(draft) : initial;
  });
  // Undo for the latest save survives a restart (see undoStore)
  const { action: undoable, undo, error: undoError } = useUndo(['saved'], repository);
  const [pendingOnLaunch] = useState(loadPendingExpenseId);
  // Synchronous guard: two taps in the same frame both see the old reducer state
  const savingRef = useRef(false);

  // Category preselected for this time of day: not the user's input, so it is never kept as a draft
  const presetRef = useRef<string | null>(null);
  // Dev builds only: time from the first input on an empty composer to the stored expense (PHASES-2, Phase 1)
  const entryStartedAt = useRef<number | null>(null);

  // Keep the unsaved draft on disk so it survives backgrounding and the app being killed
  const { draft } = state;
  useEffect(() => {
    const presetOnly = draft.categoryId === presetRef.current && isUntouched({ ...draft, categoryId: null });
    saveDraft(presetOnly ? initialQuickAddState.draft : draft);
  }, [draft]);

  // An untouched composer (launch, after a save) preselects the category usually logged at this time of day
  const untouched = isUntouched(draft) && state.phase !== 'saving';
  useEffect(() => {
    if (!untouched) return;
    let active = true;
    const since = new Date(Date.now() - SMART_DEFAULT_HISTORY_DAYS * DAY_MS).toISOString();
    Promise.all([repository.categoryTimes(since), categoryRepository.list()])
      .then(([entries, categories]) => {
        const visible = new Set(categories.filter((category) => category.isVisible).map((category) => category.id));
        const categoryId = smartDefaultCategory(entries, new Date(), (id) => visible.has(id));
        if (!active || !categoryId) return;
        presetRef.current = categoryId;
        dispatch({ type: 'categoryPreset', categoryId });
      })
      .catch(() => {
        // No preselection is the safe fallback
      });
    return () => {
      active = false;
    };
  }, [untouched, repository]);

  /** Everything the screen sends goes through here, so dev timing starts at the user's first input. */
  const userDispatch = (event: QuickAddEvent) => {
    if (__DEV__ && entryStartedAt.current === null) entryStartedAt.current = Date.now();
    dispatch(event);
  };

  // Killed mid-save last time? If that expense made it to the database, the recovered draft is stale
  useEffect(() => {
    if (!pendingOnLaunch) return;
    repository
      .get(pendingOnLaunch)
      .then((stored) => stored && dispatch({ type: 'draftDiscarded' }))
      .catch(() => {
        // Can't tell: keep the draft, the user decides
      });
  }, [pendingOnLaunch, repository]);

  useEffect(() => {
    if (state.phase !== 'saved') return;
    const timer = setTimeout(() => dispatch({ type: 'savedAcknowledged' }), SAVED_CONFIRMATION_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  const save = async () => {
    const { categoryId, amountMinor, details } = state.draft;
    if (savingRef.current || !canSave(state.draft) || !categoryId) return;
    savingRef.current = true;
    dispatch({ type: 'saveRequested' });
    try {
      const id = createId();
      // Written before the database so a kill between the two can be detected on the next launch
      saveDraft(state.draft, id);
      const expense = createExpense({ ...details, amountMinor, currencyCode, categoryId }, new Date(), id);
      await repository.save(expense);
      // The composer resets only now, after the record is stored
      dispatch({ type: 'saveSucceeded', expenseId: expense.id });
      if (__DEV__ && entryStartedAt.current !== null) {
        console.log(`[timing] expense logged in ${Date.now() - entryStartedAt.current} ms`);
      }
      entryStartedAt.current = null;
      undoStore.offer('saved', expense);
      haptics.success();
      // iOS has no live regions: say it out loud for VoiceOver
      AccessibilityInfo.announceForAccessibility(
        t('quickAdd.save.announcement', { amount: formatMoney(amountMinor, currencyCode) }),
      );
    } catch (error) {
      const message = writeFailureMessage(error, t('quickAdd.save.failed'));
      dispatch({ type: 'saveFailed', message });
      AccessibilityInfo.announceForAccessibility(message);
    } finally {
      savingRef.current = false;
    }
  };

  return { state, dispatch: userDispatch, save, undo, undoable: undoable?.expense ?? null, undoError };
}
