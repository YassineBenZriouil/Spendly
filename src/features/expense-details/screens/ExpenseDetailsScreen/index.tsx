import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { ReducedTiming } from '@/animation/tokens';
import { useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { expenseRepository } from '@/domain/expense/expense.repository';
import { updateExpense, type ExpenseDetails } from '@/domain/expense/expense.service';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { CategoryGrid } from '@/features/quick-add/components/CategoryGrid';
import { Keypad } from '@/features/quick-add/components/Keypad';
import { dragConfigFor } from '@/features/quick-add/utils/dragMapping';
import { useTheme } from '@/theme/ThemeProvider';

import { DetailsFields } from '../../components/DetailsFields';
import { recentlyDeleted } from '../../state/recentlyDeleted';
import { styles } from './styles';

type Form = { amountMinor: number; categoryId: string; details: ExpenseDetails };

const toForm = ({ amountMinor, categoryId, title, note, occurredAt, paymentMethod }: Expense): Form => ({
  amountMinor,
  categoryId,
  details: { title, note, occurredAt, paymentMethod },
});

const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

export function ExpenseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const allCategories = useCategories();

  /** undefined: loading, null: not found (or deleted elsewhere). */
  const [expense, setExpense] = useState<Expense | null | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous guard against double taps on Save / Delete
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    expenseRepository
      .get(id)
      .then((stored) => {
        if (!active) return;
        setExpense(stored);
        if (stored) setForm(toForm(stored));
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
          title={loadFailed ? "Couldn't load this expense" : 'Expense not found'}
          message={loadFailed ? 'Your data is still on this device. Go back and try again.' : 'It may have been deleted.'}
          action={{ label: 'Back to Activity', onPress: () => router.back() }}
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
  const dirty =
    form.amountMinor !== original.amountMinor ||
    form.categoryId !== original.categoryId ||
    (['title', 'note', 'occurredAt', 'paymentMethod'] as const).some(
      (key) => (form.details[key] ?? '').toString().trim() !== (original.details[key] ?? ''),
    );
  const canSave = dirty && form.amountMinor > 0 && !busy;

  const run = async (task: () => Promise<void>, failure: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch {
      // Values stay in the form so nothing typed is lost
      setError(failure);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const save = () => {
    Keyboard.dismiss();
    run(async () => {
      await expenseRepository.update(updateExpense(expense, changes));
      router.back();
    }, "Couldn't save changes. Your edits are still here.");
  };

  const confirmDelete = () => {
    Keyboard.dismiss();
    Alert.alert('Delete this expense?', `${amountLabel} will be removed from your history.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await expenseRepository.remove(expense.id);
            recentlyDeleted.set(expense);
            router.back();
          }, "Couldn't delete. Try again."),
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
        contentContainerStyle={styles.content}>
        <Animated.View entering={entering} style={styles.sections}>
          <View style={styles.amountRow}>
            <View
              accessible
              accessibilityLabel={`Amount, ${amountLabel}`}
              accessibilityLiveRegion="polite"
              style={styles.amountSlot}>
              {/* Keyed so each new amount cross-fades in */}
              <Animated.View key={amountLabel} {...fade} style={styles.amountLayer}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: colors.textPrimary }]}>
                  {amountLabel}
                </Text>
              </Animated.View>
            </View>
            <IconButton
              icon={keypadOpen ? 'close' : 'keypad'}
              accessibilityLabel={keypadOpen ? 'Close keypad' : 'Change amount with keypad'}
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

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Category</Text>
          <CategoryGrid
            categories={categories}
            selectedId={form.categoryId}
            onSelect={(category) => setForm({ ...form, categoryId: category.id })}
          />

          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Details</Text>
          <DetailsFields
            details={form.details}
            onChange={(detailChanges) => setForm({ ...form, details: { ...form.details, ...detailChanges } })}
          />

          {error && (
            <Animated.View
              {...fade}
              accessibilityLiveRegion="polite"
              style={[styles.error, { backgroundColor: colors.surfaceSecondary }]}>
              <Icon name="error" color={colors.danger} size={18} />
              <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
            </Animated.View>
          )}

          <View style={styles.actions}>
            <Button label="Save changes" disabled={!canSave} onPress={save} />
            <Button label="Delete expense" variant="secondary" disabled={busy} onPress={confirmDelete} />
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
