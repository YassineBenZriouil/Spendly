import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration, ReducedTiming } from '@/animation/tokens';
import { settleTo } from '@/animation/transitions';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { Screen } from '@/components/Screen';
import { BuiltInCategories } from '@/domain/category/builtInCategories';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { deviceCurrency, formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { haptics } from '@/haptics/haptics.service';
import { useTheme } from '@/theme/ThemeProvider';

import { AmountSurface } from '../../components/AmountSurface';
import { CategoryGrid } from '../../components/CategoryGrid';
import { Keypad } from '../../components/Keypad';
import { MorphChip } from '../../components/MorphChip';
import { SaveAction } from '../../components/SaveAction';
import { useAmountDrag } from '../../hooks/useAmountDrag';
import { useCategoryMorph } from '../../hooks/useCategoryMorph';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { canSave } from '../../state/quickAddReducer';
import { clampAmount, dragConfigFor } from '../../utils/dragMapping';
import { styles } from './styles';

// shortcut: built-ins only; Phase 2 loads categories (incl. custom/hidden) from the database
const categories = BuiltInCategories.filter((category) => category.isVisible);

export function QuickAddScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const currencyCode = deviceCurrency();
  const pattern = getMoneyPattern(currencyCode);
  const config = dragConfigFor(currencyCode);

  const { state, dispatch, save, undo, undoable } = useQuickAdd(currencyCode);
  const { draft, phase } = state;
  const { stageRef, anchorRef, chips, show, hide, remove } = useCategoryMorph();
  const [keypadOpen, setKeypadOpen] = useState(false);
  const amount = useSharedValue(0);
  const busy = phase === 'saving';

  const setAmount = (amountMinor: number) =>
    dispatch({ type: 'amountChanged', amountMinor: clampAmount(amountMinor, config) });

  const { gesture, pulse } = useAmountDrag({
    amount,
    config,
    enabled: !busy,
    onDragStart: () => dispatch({ type: 'dragStarted' }),
    onDragEnd: (amountMinor) => dispatch({ type: 'dragEnded', amountMinor }),
  });

  const selectCategory = (category: ExpenseCategory, tileRef: AnimatedRef<View>) => {
    if (busy || category.id === draft.categoryId) return;
    haptics.select();
    dispatch({ type: 'selectCategory', categoryId: category.id });
    show(category, tileRef);
  };

  // Draft reset after saving: the chip flies back into its tile
  useEffect(() => {
    if (draft.categoryId === null) hide();
  }, [draft.categoryId, hide]);

  const selected = categories.find((category) => category.id === draft.categoryId);
  const savedExpense = undoable
    ? `${formatMoney(undoable.amountMinor, undoable.currencyCode)}, ${categories.find((c) => c.id === undoable.categoryId)?.name ?? ''}`
    : null;

  const placeholderVisible = useSharedValue(selected ? 0 : 1);
  useEffect(() => {
    placeholderVisible.set(settleTo(selected ? 0 : 1, reducedMotion));
  }, [selected, reducedMotion, placeholderVisible]);
  const placeholderStyle = useAnimatedStyle(() => ({ opacity: placeholderVisible.get() }));

  const panelEnter = reducedMotion
    ? FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion)
    : FadeInDown.duration(Duration.standard);
  const panelExit = reducedMotion
    ? FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion)
    : FadeOutDown.duration(Duration.quick);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Today</Text>
        <IconButton icon="settings" variant="plain" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </View>

      <View ref={stageRef} collapsable={false} style={styles.stage}>
        <View
          ref={anchorRef}
          collapsable={false}
          accessible
          accessibilityLabel={selected ? `Category: ${selected.name}` : 'No category selected'}
          style={[styles.anchor, { borderColor: colors.borderSubtle }]}>
          <Animated.Text style={[styles.placeholder, { color: colors.textSecondary }, placeholderStyle]}>
            Choose a category
          </Animated.Text>
        </View>

        <AmountSurface
          amount={amount}
          pulse={pulse}
          gesture={gesture}
          amountMinor={draft.amountMinor}
          currencyCode={currencyCode}
          pattern={pattern}
          onIncrement={() => setAmount(draft.amountMinor + config.stepMinor)}
          onDecrement={() => setAmount(draft.amountMinor - config.stepMinor)}
        />

        <View style={styles.controls}>
          <IconButton
            icon="minus"
            accessibilityLabel="Decrease amount"
            disabled={busy || draft.amountMinor === 0}
            onPress={() => setAmount(draft.amountMinor - config.stepMinor)}
          />
          <IconButton
            icon={keypadOpen ? 'close' : 'keypad'}
            accessibilityLabel={keypadOpen ? 'Close keypad' : 'Type amount with keypad'}
            disabled={busy}
            onPress={() => setKeypadOpen((open) => !open)}
          />
          <IconButton
            icon="reset"
            accessibilityLabel="Reset amount to zero"
            disabled={busy || draft.amountMinor === 0}
            onPress={() => setAmount(0)}
          />
          <IconButton
            icon="plus"
            accessibilityLabel="Increase amount"
            disabled={busy || draft.amountMinor >= config.maxAmountMinor}
            onPress={() => setAmount(draft.amountMinor + config.stepMinor)}
          />
        </View>

        <View style={styles.panel}>
          {keypadOpen ? (
            <Animated.View key="keypad" entering={panelEnter} exiting={panelExit} style={styles.panelLayer}>
              <Keypad
                amountMinor={draft.amountMinor}
                pattern={pattern}
                maxAmountMinor={config.maxAmountMinor}
                onChange={setAmount}
              />
            </Animated.View>
          ) : (
            <Animated.View key="categories" entering={panelEnter} exiting={panelExit} style={styles.panelLayer}>
              <CategoryGrid categories={categories} selectedId={draft.categoryId} onSelect={selectCategory} />
            </Animated.View>
          )}
        </View>

        {chips.map((chip) => (
          <MorphChip
            key={chip.key}
            chip={chip}
            stageRef={stageRef}
            anchorRef={anchorRef}
            onGone={remove}
          />
        ))}
      </View>

      {phase === 'error' && (
        <Animated.View
          entering={panelEnter}
          exiting={reducedMotion ? panelExit : FadeOutUp.duration(Duration.quick)}
          accessibilityLiveRegion="polite"
          style={[styles.error, { backgroundColor: colors.surfaceSecondary }]}>
          <Icon name="error" color={colors.danger} size={18} />
          <Text style={[styles.errorText, { color: colors.textPrimary }]}>
            Couldn&apos;t save. Your entry is still here.
          </Text>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <SaveAction
          phase={phase}
          canSave={canSave(draft) && !busy}
          onSave={save}
          undoLabel={savedExpense}
          onUndo={undo}
        />
      </View>
    </Screen>
  );
}
