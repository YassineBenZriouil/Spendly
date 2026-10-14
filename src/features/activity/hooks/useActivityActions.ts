import { AccessibilityInfo, Alert } from 'react-native';

import { expenseRepository } from '@/domain/expense/expense.repository';
import { againFrom } from '@/domain/expense/expense.service';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { expenseFor, recurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';
import { undoStore } from '@/features/undo/state/undoStore';
import { haptics } from '@/haptics/haptics.service';
import { t } from '@/i18n';
import { writeFailureMessage } from '@/storage/database/errors';
import { formatDay } from '@/utils/dateFormat';

const failed = (error: unknown) =>
  Alert.alert(t('activity.pending.failedTitle'), writeFailureMessage(error, t('activity.pending.failed')));

/** Again and the Confirm / Skip / Stop actions on repeating expenses. Every outcome is announced; most offer Undo. */
export function useActivityActions(nameOf: (occurrence: Occurrence) => string) {
  const again = async (expense: Expense) => {
    try {
      const copy = againFrom(expense);
      await expenseRepository.save(copy);
      undoStore.offer('saved', copy);
      haptics.success();
      AccessibilityInfo.announceForAccessibility(t('activity.again.done'));
    } catch (error) {
      Alert.alert(t('activity.pending.failedTitle'), writeFailureMessage(error, t('expense.again.failed')));
    }
  };

  const confirm = async (occurrence: Occurrence) => {
    try {
      const expense = await recurrenceRepository.confirm(occurrence);
      expenseRepository.notifyChanged();
      undoStore.offer('confirmed', expense, Date.now(), { recurrenceId: occurrence.recurrenceId, index: occurrence.index });
      haptics.success();
      AccessibilityInfo.announceForAccessibility(t('activity.pending.confirmed'));
    } catch (error) {
      failed(error);
    }
  };

  const skip = async (occurrence: Occurrence) => {
    try {
      await recurrenceRepository.skip(occurrence);
      // What would have been saved, so the Undo bar can name it
      undoStore.offer('skipped', expenseFor(occurrence), Date.now(), { recurrenceId: occurrence.recurrenceId, index: occurrence.index });
      haptics.select();
      AccessibilityInfo.announceForAccessibility(t('activity.pending.skipped'));
    } catch (error) {
      failed(error);
    }
  };

  const stop = async (occurrence: Occurrence) => {
    try {
      await recurrenceRepository.stop(occurrence.recurrenceId);
      AccessibilityInfo.announceForAccessibility(t('activity.pending.stopped'));
    } catch (error) {
      failed(error);
    }
  };

  /** Tapping a pending row: every choice, spelled out. */
  const more = (occurrence: Occurrence) => {
    const amount = formatMoney(occurrence.template.amountMinor, occurrence.template.currencyCode);
    Alert.alert(
      t('activity.pending.menuTitle', { name: nameOf(occurrence), amount }),
      t('activity.pending.menuMessage', { day: formatDay(new Date(occurrence.dueAt)) }),
      [
        { text: t('activity.pending.confirm'), onPress: () => confirm(occurrence) },
        { text: t('activity.pending.skip'), onPress: () => skip(occurrence) },
        { text: t('activity.pending.stop'), style: 'destructive', onPress: () => stop(occurrence) },
        { text: t('common.cancel'), style: 'cancel' },
      ],
    );
  };

  /** Confirm or skip every due occurrence, after saying how many (no Undo for a batch). */
  const handleAll = (occurrences: Occurrence[], outcome: 'confirm' | 'skip') => {
    const count = occurrences.length;
    Alert.alert(
      t(outcome === 'confirm' ? 'activity.pending.confirmAllTitle' : 'activity.pending.skipAllTitle', { count }),
      t(outcome === 'confirm' ? 'activity.pending.confirmAllMessage' : 'activity.pending.skipAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t(outcome === 'confirm' ? 'activity.pending.confirmAll' : 'activity.pending.skipAll'),
          onPress: async () => {
            try {
              for (const occurrence of occurrences) {
                if (outcome === 'confirm') await recurrenceRepository.confirm(occurrence);
                else await recurrenceRepository.skip(occurrence);
              }
              expenseRepository.notifyChanged();
              AccessibilityInfo.announceForAccessibility(
                t(outcome === 'confirm' ? 'activity.pending.confirmedAll' : 'activity.pending.skippedAll', { count }),
              );
            } catch (error) {
              failed(error);
            }
          },
        },
      ],
    );
  };

  return { again, confirm, skip, more, handleAll };
}
