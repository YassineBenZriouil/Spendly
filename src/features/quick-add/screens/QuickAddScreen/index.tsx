import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Keyboard, ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
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
import type { ExpenseCategory } from '@/domain/category/category.types';
import { formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { DetailsFields } from '@/features/expense-details/components/DetailsFields';
import { haptics } from '@/haptics/haptics.service';
import { usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';

import { AmountSurface } from '../../components/AmountSurface';
import { CategoryGrid } from '../../components/CategoryGrid';
import { Keypad } from '../../components/Keypad';
import { MorphChip } from '../../components/MorphChip';
import { SaveAction } from '../../components/SaveAction';
import { useAmountDrag } from '../../hooks/useAmountDrag';
import { useCategoryMorph } from '../../hooks/useCategoryMorph';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { useTodayTotal } from '../../hooks/useTodayTotal';
import { canSave } from '../../state/quickAddReducer';
import { clampAmount, dragConfigFor } from '../../utils/dragMapping';
import { styles } from './styles';

export function QuickAddScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { currencyCode, dragSensitivity, amountIncrement } = usePreferences();
  const allCategories = useCategories();
  const categories = allCategories.filter((category) => category.isVisible);
  const todayTotals = useTodayTotal();
  const pattern = getMoneyPattern(currencyCode);
  const config = dragConfigFor(currencyCode, { sensitivity: dragSensitivity, increment: amountIncrement });

  const { state, dispatch, save, undo, undoable } = useQuickAdd(currencyCode);
  const { draft, phase } = state;
  const { stageRef, anchorRef, chips, show, hide, remove } = useCategoryMorph();
  /** What the bottom panel shows. Navigation-ish UI state, not part of the draft. */
  const [panel, setPanel] = useState<'categories' | 'keypad' | 'details'>('categories');
  const togglePanel = (next: 'keypad' | 'details') => {
    Keyboard.dismiss();
    setPanel((current) => (current === next ? 'categories' : next));
  };
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

  // Just saved: back to the grid for the next expense (adjusted during render, not in an effect)
  const [previousPhase, setPreviousPhase] = useState(phase);
  if (phase !== previousPhase) {
    setPreviousPhase(phase);
    if (phase === 'saved') setPanel('categories');
  }

  const hasDetails = Object.values(draft.details ?? {}).some(Boolean);

  const selected = allCategories.find((category) => category.id === draft.categoryId);
  const savedExpense = undoable
    ? `${formatMoney(undoable.amountMinor, undoable.currencyCode)}, ${allCategories.find((c) => c.id === undoable.categoryId)?.name ?? ''}`
    : null;

  // A draft recovered on launch has no tapped tile: show its chip once the anchor can be measured
  const restorePending = useRef(draft.categoryId !== null);
  const onAnchorLayout = () => {
    if (!restorePending.current) return;
    restorePending.current = false;
    if (selected && chips.length === 0) show(selected, null);
  };

  const todayLabel =
    todayTotals.length > 0
      ? `Today · ${todayTotals.map((total) => formatMoney(total.totalMinor, total.currencyCode)).join(' + ')}`
      : 'Today';

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
        {/* Keyed so a new total cross-fades in */}
        <Animated.Text
          key={todayLabel}
          entering={panelEnter}
          exiting={FadeOut.duration(ReducedTiming.duration)}
          accessibilityLabel={todayLabel.replace(' · ', ', spent ')}
          style={[styles.date, { color: colors.textSecondary }]}>
          {todayLabel}
        </Animated.Text>
        <IconButton icon="settings" variant="plain" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </View>

      {/* Only the details panel opens the keyboard: the stage shrinks (amount area first) to keep it in view */}
      <KeyboardAvoidingView behavior="padding" style={styles.stage}>
        <View ref={stageRef} collapsable={false} style={styles.stage}>
          <View
            ref={anchorRef}
            collapsable={false}
            onLayout={onAnchorLayout}
            accessible
            accessibilityLabel={selected ? `Category: ${selected.name}` : 'No category selected'}
            style={[styles.anchor, { borderColor: colors.borderSubtle }]}>
            <Animated.Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.placeholder, { color: colors.textSecondary }, placeholderStyle]}>
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
              icon={panel === 'keypad' ? 'close' : 'keypad'}
              accessibilityLabel={panel === 'keypad' ? 'Close keypad' : 'Type amount with keypad'}
              disabled={busy}
              onPress={() => togglePanel('keypad')}
            />
            <IconButton
              icon={panel === 'details' ? 'close' : 'details'}
              accessibilityLabel={
                panel === 'details' ? 'Close details' : hasDetails ? 'Edit details (added)' : 'Add details'
              }
              disabled={busy}
              onPress={() => togglePanel('details')}
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
            {panel === 'keypad' ? (
              <Animated.View key="keypad" entering={panelEnter} exiting={panelExit} style={styles.panelLayer}>
                <Keypad
                  amountMinor={draft.amountMinor}
                  pattern={pattern}
                  maxAmountMinor={config.maxAmountMinor}
                  onChange={setAmount}
                />
              </Animated.View>
            ) : panel === 'details' ? (
              <Animated.View key="details" entering={panelEnter} exiting={panelExit} style={styles.detailsLayer}>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                  <DetailsFields
                    details={draft.details ?? {}}
                    onChange={(changes) => dispatch({ type: 'detailsChanged', changes })}
                    dateResettable
                  />
                </ScrollView>
              </Animated.View>
            ) : (
              <Animated.View key="categories" entering={panelEnter} exiting={panelExit} style={styles.panelLayer}>
                <CategoryGrid
                  categories={categories}
                  selectedId={draft.categoryId}
                  onSelect={selectCategory}
                  onLongPress={() => router.push('/categories')}
                />
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
      </KeyboardAvoidingView>

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
          onSave={() => {
            Keyboard.dismiss();
            save();
          }}
          undoLabel={savedExpense}
          onUndo={undo}
        />
      </View>
    </Screen>
  );
}
