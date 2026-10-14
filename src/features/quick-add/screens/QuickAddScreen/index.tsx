import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, Text, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, {
  FadeInDown,
  FadeOutDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import { ErrorBanner } from '@/components/ErrorBanner';

import { IconButton } from '@/components/IconButton';
import { MoneyTotals } from '@/components/MoneyTotals';
import { Screen } from '@/components/Screen';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { formatMoney } from '@/domain/money/money.format';
import { getMoneyPattern } from '@/domain/money/money.pattern';
import { useCategoryList } from '@/features/categories/hooks/useCategories';
import { DetailsFields } from '@/features/expense-details/components/DetailsFields';
import { haptics } from '@/haptics/haptics.service';
import { usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge, FontScaleCap } from '@/theme/tokens';
import { t } from '@/i18n';

import { AmountSuggestions } from '../../components/AmountSuggestions';
import { AmountSurface } from '../../components/AmountSurface';
import { CategoryGrid } from '../../components/CategoryGrid';
import { Keypad } from '../../components/Keypad';
import { MorphChip } from '../../components/MorphChip';
import { SaveAction } from '../../components/SaveAction';
import { useAmountDrag } from '../../hooks/useAmountDrag';
import { useCategoryMorph } from '../../hooks/useCategoryMorph';
import { useAmountSuggestions } from '../../hooks/useAmountSuggestions';
import { useQuickAdd } from '../../hooks/useQuickAdd';
import { useTodayTotal } from '../../hooks/useTodayTotal';
import { canSave } from '../../state/quickAddReducer';
import { clampAmount, dragConfigFor } from '../../utils/dragMapping';
import { styles } from './styles';

export function QuickAddScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const { currencyCode, dragSensitivity, amountIncrement } = usePreferences();
  const { categories: allCategories, loaded: categoriesLoaded } = useCategoryList();
  const categories = allCategories.filter((category) => category.isVisible);
  const todayTotals = useTodayTotal();
  const pattern = getMoneyPattern(currencyCode);
  const config = dragConfigFor(currencyCode, { sensitivity: dragSensitivity, increment: amountIncrement });

  const { state, dispatch, save, undo, undoable, undoError } = useQuickAdd(currencyCode);
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

  const { gesture, pulse, edgeOffset } = useAmountDrag({
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

  const hasDetails = Object.values(draft.details ?? {}).some(Boolean) || draft.repeat !== undefined;

  const selected = allCategories.find((category) => category.id === draft.categoryId);
  const savedExpense = undoable
    ? t('quickAdd.undo.expense', {
        amount: formatMoney(undoable.amountMinor, undoable.currencyCode),
        category: allCategories.find((c) => c.id === undoable.categoryId)?.name ?? '',
      })
    : null;

  // A category selected without a tapped tile (draft restored on launch, preselected for this time of day) gets
  // its chip at the anchor once the anchor can be measured and the category has loaded (custom categories arrive
  // from the database after the first layout). Tapped tiles already show their own chip.
  const [anchorLaidOut, setAnchorLaidOut] = useState(false);
  const activeChipCategoryId = chips.find((chip) => chip.state === 'active')?.category.id;
  useEffect(() => {
    if (anchorLaidOut && selected && activeChipCategoryId !== selected.id) show(selected, null);
  }, [anchorLaidOut, selected, activeChipCategoryId, show]);

  const suggestions = useAmountSuggestions(draft.categoryId, currencyCode);
  const pickSuggestion = (amountMinor: number) => {
    haptics.select();
    setAmount(amountMinor);
  };

  const todayLabel =
    todayTotals.length > 0
      ? t('quickAdd.today.spentLabel', {
          amounts: todayTotals
            .map((total) => formatMoney(total.totalMinor, total.currencyCode))
            .join(t('quickAdd.today.amountsSeparator')),
        })
      : t('quickAdd.today.label');

  const placeholderVisible = useSharedValue(selected ? 0 : 1);
  useEffect(() => {
    placeholderVisible.set(settleTo(selected ? 0 : 1, reducedMotion));
  }, [selected, reducedMotion, placeholderVisible]);
  const placeholderStyle = useAnimatedStyle(() => ({ opacity: placeholderVisible.get() }));

  const panelEnter = reducedMotion
    ? fade.entering
    : FadeInDown.duration(Duration.standard);
  const panelExit = reducedMotion
    ? fade.exiting
    : FadeOutDown.duration(Duration.quick);

  return (
    <Screen>
      <View style={styles.header}>
        {/* Today's total: digits roll as it changes */}
        <View accessible accessibilityLabel={todayLabel} style={styles.today}>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{t('quickAdd.today.label')}</Text>
          {todayTotals.length > 0 && (
            <Animated.Text {...fade} style={[styles.date, { color: colors.textSecondary }]}>
              ·
            </Animated.Text>
          )}
          <MoneyTotals totals={todayTotals} size="label" color={colors.textSecondary} />
        </View>
        <IconButton icon="settings" variant="plain" accessibilityLabel={t('quickAdd.settingsButton.label')} onPress={() => router.push('/settings')} />
      </View>

      {/* Only the details panel opens the keyboard: the stage shrinks (amount area first) to keep it in view */}
      <KeyboardAvoidingView behavior="padding" style={styles.stage}>
        <View ref={stageRef} collapsable={false} style={styles.stage}>
          <View
            ref={anchorRef}
            collapsable={false}
            onLayout={() => setAnchorLaidOut(true)}
            accessible
            accessibilityLabel={selected ? t('quickAdd.anchor.selectedLabel', { category: selected.name }) : t('quickAdd.anchor.emptyLabel')}
            style={[styles.anchor, { borderColor: colors.borderSubtle }]}>
            <Animated.Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.placeholder, { color: colors.textSecondary }, placeholderStyle]}>
              {t('quickAdd.anchor.placeholder')}
            </Animated.Text>
          </View>

          <AmountSurface
            amount={amount}
            pulse={pulse}
            edgeOffset={edgeOffset}
            gesture={gesture}
            amountMinor={draft.amountMinor}
            currencyCode={currencyCode}
            maxAmountMinor={config.maxAmountMinor}
            onIncrement={() => setAmount(draft.amountMinor + config.stepMinor)}
            onDecrement={() => setAmount(draft.amountMinor - config.stepMinor)}
            accessory={
              suggestions.length > 0 && !busy ? (
                <AmountSuggestions amounts={suggestions} currencyCode={currencyCode} onPick={pickSuggestion} />
              ) : undefined
            }
          />

          <View style={styles.controls}>
            <IconButton
              icon="minus"
              accessibilityLabel={t('quickAdd.controls.decrease')}
              disabled={busy || draft.amountMinor === 0}
              onPress={() => setAmount(draft.amountMinor - config.stepMinor)}
            />
            <IconButton
              icon={panel === 'keypad' ? 'close' : 'keypad'}
              variant="plain"
              accessibilityLabel={panel === 'keypad' ? t('quickAdd.controls.closeKeypad') : t('quickAdd.controls.openKeypad')}
              disabled={busy}
              onPress={() => togglePanel('keypad')}
            />
            <IconButton
              icon={panel === 'details' ? 'close' : 'details'}
              variant="plain"
              accessibilityLabel={
                panel === 'details'
                  ? t('quickAdd.controls.closeDetails')
                  : hasDetails
                    ? t('quickAdd.controls.editDetails')
                    : t('quickAdd.controls.addDetails')
              }
              disabled={busy}
              onPress={() => togglePanel('details')}
            />
            <IconButton
              icon="reset"
              variant="plain"
              accessibilityLabel={t('quickAdd.controls.resetAmount')}
              disabled={busy || draft.amountMinor === 0}
              onPress={() => setAmount(0)}
            />
            <IconButton
              icon="plus"
              accessibilityLabel={t('quickAdd.controls.increase')}
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
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={EdgeToEdge.scroll}
                  contentContainerStyle={EdgeToEdge.content}>
                  <DetailsFields
                    details={draft.details ?? {}}
                    onChange={(changes) => dispatch({ type: 'detailsChanged', changes })}
                    dateResettable
                    repeat={draft.repeat ?? null}
                    onRepeatChange={(repeat) => dispatch({ type: 'repeatChanged', repeat })}
                  />
                </ScrollView>
              </Animated.View>
            ) : (
              <Animated.View key="categories" entering={panelEnter} exiting={panelExit} style={styles.panelLayer}>
                {/* Shown once the stored order is known: if tiles moved while their entrance animation runs,
                    some would stay in their first spot (overlapping a neighbour, leaving a gap) */}
                {categoriesLoaded && (
                  <CategoryGrid
                    categories={categories}
                    selectedId={draft.categoryId}
                    onSelect={selectCategory}
                    onLongPress={() => router.push('/categories')}
                  />
                )}
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
        <View style={styles.error}>
          <ErrorBanner
            message={state.error ?? t('quickAdd.save.failed')}
            entering={panelEnter}
            exiting={reducedMotion ? panelExit : FadeOutUp.duration(Duration.quick)}
          />
        </View>
      )}

      {undoError && (
        <View style={styles.error}>
          <ErrorBanner message={undoError} />
        </View>
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
