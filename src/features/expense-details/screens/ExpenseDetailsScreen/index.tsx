import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Keyboard, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition, useLayoutTransition } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';

import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { againFrom, type ExpenseDetails, updateExpense } from '@/domain/expense/expense.service';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { recurrenceRepository } from '@/domain/recurrence/recurrence.repository';
import type { Frequency, Recurrence } from '@/domain/recurrence/recurrence.types';
import { t } from '@/i18n';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { CategoryGrid } from '@/features/quick-add/components/CategoryGrid';
import { Keypad } from '@/features/quick-add/components/Keypad';
import { dragConfigFor } from '@/features/quick-add/utils/dragMapping';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';
import { undoStore } from '@/features/undo/state/undoStore';
import { writeFailureMessage } from '@/storage/database/errors';

import { DetailsFields } from '../../components/DetailsFields';
import { styles } from './styles';

type Form = { amountMinor: number; categoryId: string; details: ExpenseDetails };

const toForm = ({ amountMinor, categoryId, title, note, occurredAt, paymentMethod }: Expense): Form => ({
  amountMinor,
  categoryId,
  details: { title, note, occurredAt, paymentMethod },
});

export function ExpenseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const layout = useLayoutTransition();
  const allCategories = useCategories();

  /** undefined: loading, null: not found (or deleted elsewhere). */
  const [expense, setExpense] = useState<Expense | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The repeat rule this expense belongs to (undefined while loading) and the Repeat choice on screen. */
  const [rule, setRule] = useState<Recurrence | null | undefined>(undefined);
  const [repeat, setRepeat] = useState<Frequency | null>(null);
  // Synchronous guard against double taps on Save / Delete
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([expenseRepository.get(id), recurrenceRepository.forExpense(id)])
      .then(([stored, storedRule]) => {
        if (!active) return;
        setExpense(stored);
        if (stored) setForm(toForm(stored));
        setRule(storedRule);
        setRepeat(storedRule?.frequency ?? null);
      })
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [id]);

  if (loadFailed || expense === null) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon={loadFailed ? 'error' : 'activity'}
          title={t(loadFailed ? 'expense.loadFailed.title' : 'expense.notFound.title')}
          message={t(loadFailed ? 'expense.loadFailed.message' : 'expense.notFound.message')}
          action={{ label: t('expense.backToActivity'), onPress: () => router.back() }}
        />
      </Screen>
    );
  }
  if (!expense || !form) return <Screen edges={['bottom']}>{null}</Screen>;

  const { currencyCode } = expense;
  const pattern = getMoneyPattern(currencyCode);
  const { maxAmountMinor } = dragConfigFor(currencyCode);
  // A hidden category stays pickable for the expense that already uses it
  const categories = allCategories.filter((c) => c.isVisible || c.id === expense.categoryId);
  const amountLabel = formatMoney(form.amountMinor, currencyCode);

  const changes = {
    amountMinor: form.amountMinor,
    categoryId: form.categoryId,
    title: form.details.title,
    note: form.details.note,
    occurredAt: form.details.occurredAt,
    paymentMethod: form.details.paymentMethod,
  };
  const original = toForm(expense);
  const repeatChanged = rule !== undefined && repeat !== (rule?.frequency ?? null);
  const fieldsChanged =
    form.amountMinor !== original.amountMinor ||
    form.categoryId !== original.categoryId ||
    (['title', 'note', 'occurredAt', 'paymentMethod'] as const).some(
      (key) => (form.details[key] ?? '').toString().trim() !== (original.details[key] ?? ''),
    );
  const canSave = (fieldsChanged || repeatChanged) && form.amountMinor > 0 && !busy;

  const run = async (task: () => Promise<void>, failure: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (error) {
      // Values stay in the form so nothing typed is lost
      setError(writeFailureMessage(error, failure));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const save = () => {
    Keyboard.dismiss();
    run(async () => {
      const updated = fieldsChanged ? updateExpense(expense, changes) : expense;
      if (fieldsChanged) {
        await expenseRepository.update(updated);
        // The version before the edit, so Activity can offer Undo (even after a restart)
        undoStore.offer('edited', expense);
      }
      if (repeatChanged) {
        // A new choice starts a new rule from this expense (replacing the old one); "Doesn't repeat" stops it
        if (repeat) await recurrenceRepository.repeat(updated, repeat);
        else if (rule) await recurrenceRepository.stop(rule.id);
      }
      AccessibilityInfo.announceForAccessibility(t('expense.save.done'));
      router.back();
    }, t('expense.save.failed'));
  };

  // "Again": the same category, amount and title, dated now; Activity offers Undo
  const addAgain = () => {
    Keyboard.dismiss();
    run(async () => {
      const again = againFrom(expense);
      await expenseRepository.save(again);
      undoStore.offer('saved', again);
      AccessibilityInfo.announceForAccessibility(t('expense.again.done'));
      router.back();
    }, t('expense.again.failed'));
  };

  const confirmDelete = () => {
    Keyboard.dismiss();
    Alert.alert(t('expense.delete.confirmTitle'), t('expense.delete.confirmMessage', { amount: amountLabel }), [
      { text: t('expense.delete.cancel'), style: 'cancel' },
      {
        text: t('expense.delete.confirm'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await expenseRepository.remove(expense.id);
            undoStore.offer('deleted', expense);
            AccessibilityInfo.announceForAccessibility(t('expense.delete.done'));
            router.back();
          }, t('expense.delete.failed')),
      },
    ]);
  };

  return (
    <Screen edges={['bottom']}>
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
        <Animated.View entering={entering} style={styles.sections}>
          <View style={styles.amountRow}>
            <View
              accessible
              accessibilityLabel={t('expense.amount.label', { amount: amountLabel })}
              accessibilityLiveRegion="polite"
              style={styles.amountSlot}>
              <AnimatedNumber value={form.amountMinor} currencyCode={currencyCode} size="hero" hero fit accessible={false} />
            </View>
            <IconButton
              icon={keypadOpen ? 'close' : 'keypad'}
              accessibilityLabel={t(keypadOpen ? 'expense.keypad.close' : 'expense.keypad.open')}
              onPress={() => {
                Keyboard.dismiss();
                setKeypadOpen((open) => !open);
              }}
            />
          </View>
          {keypadOpen && (
            <Animated.View entering={entering} exiting={fade.exiting}>
              <Keypad
                amountMinor={form.amountMinor}
                pattern={pattern}
                maxAmountMinor={maxAmountMinor}
                onChange={(amountMinor) => setForm({ ...form, amountMinor })}
              />
            </Animated.View>
          )}

          {/* Slides to make room as the keypad opens and closes (cross-fades with reduced motion) */}
          <Animated.View
            layout={layout}
            style={styles.sections}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('expense.section.category')}</Text>
            <CategoryGrid
              categories={categories}
              selectedId={form.categoryId}
              onSelect={(category) => setForm({ ...form, categoryId: category.id })}
            />

            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{t('expense.section.details')}</Text>
            <DetailsFields
              details={form.details}
              onChange={(detailChanges) => setForm({ ...form, details: { ...form.details, ...detailChanges } })}
              repeat={repeat}
              onRepeatChange={rule === undefined ? undefined : setRepeat}
            />

            {error && (
              <ErrorBanner message={error} />
            )}

            <View style={styles.actions}>
              <Button label={t('expense.save')} disabled={!canSave} onPress={save} />
              <Button label={t('expense.again')} variant="secondary" disabled={busy} onPress={addAgain} accessibilityHint={t('expense.again.hint')} />
              <Button label={t('expense.delete')} variant="secondary" disabled={busy} onPress={confirmDelete} />
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
