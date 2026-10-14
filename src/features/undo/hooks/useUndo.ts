import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';
import { t } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';

import { undoStore, type UndoAction, type UndoKind } from '../state/undoStore';

const getUndo = () => undoStore.get();

const DONE: Record<UndoKind, string> = {
  saved: t('activity.undo.done.saved'),
  deleted: t('activity.undo.done.deleted'),
  edited: t('activity.undo.done.edited'),
};

/** Reverses an action in the database. */
export async function performUndo(action: UndoAction, repository: ExpenseRepository) {
  if (action.kind === 'saved') await repository.remove(action.expense.id);
  else if (action.kind === 'deleted') await repository.restore(action.expense.id);
  else await repository.update(action.expense);
}

/**
 * The pending undoable action of the given kinds (null otherwise), expiring on time, and `undo` to reverse it.
 * If reversing fails, the action stays available and `error` explains why.
 */
export function useUndo(kinds: UndoKind[], repository: ExpenseRepository = expenseRepository) {
  const pending = useSyncExternalStore(undoStore.subscribe, getUndo);
  const action = pending && kinds.includes(pending.kind) ? pending : null;
  const [failure, setFailure] = useState<{ action: UndoAction; message: string } | null>(null);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => undoStore.clear(pending), Math.max(0, pending.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [pending]);

  const undo = async () => {
    if (!action) return;
    undoStore.clear(action);
    setFailure(null);
    try {
      await performUndo(action, repository);
      AccessibilityInfo.announceForAccessibility(DONE[action.kind]);
    } catch (error) {
      undoStore.reinstate(action);
      const message = writeFailureMessage(error, t('activity.undo.failed'));
      setFailure({ action, message });
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  return { action, undo, error: failure && failure.action === action ? failure.message : null };
}
