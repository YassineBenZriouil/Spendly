import { useEffect, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo } from 'react-native';

import { expenseRepository, type ExpenseRepository } from '@/domain/expense/expense.repository';
import { recurrenceRepository, type RecurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import { t } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';

import { undoStore, type UndoAction, type UndoKind } from '../state/undoStore';

const getUndo = () => undoStore.get();

const DONE: Record<UndoKind, string> = {
  saved: t('activity.undo.done.saved'),
  deleted: t('activity.undo.done.deleted'),
  edited: t('activity.undo.done.edited'),
  confirmed: t('activity.undo.done.confirmed'),
  skipped: t('activity.undo.done.skipped'),
};

/** Reverses an action in the database. */
export async function performUndo(
  action: UndoAction,
  repository: ExpenseRepository,
  recurrences: RecurrenceRepository = recurrenceRepository,
) {
  const { kind, expense, occurrence } = action;
  if (kind === 'saved') {
    await repository.remove(expense.id);
    // A save that started repeating is undone with its rule
    await recurrences.stopStartedBy(expense.id);
  } else if (kind === 'deleted') {
    await repository.restore(expense.id);
  } else if (kind === 'edited') {
    await repository.update(expense);
  } else if (occurrence) {
    if (kind === 'confirmed') await repository.remove(expense.id);
    await recurrences.unhandle(occurrence.recurrenceId, occurrence.index);
  }
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
