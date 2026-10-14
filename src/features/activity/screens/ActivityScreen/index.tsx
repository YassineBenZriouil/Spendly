import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  type BaseAnimationBuilder,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { fade, useEnterTransition, useLayoutTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import type { Expense } from '@/domain/expense/expense.types';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';
import type { UndoKind } from '@/features/undo/state/undoStore';
import { formatMoney } from '@/domain/money/money.format';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useUndo } from '@/features/undo/hooks/useUndo';
import { t, type MessageKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';

import { AgainSwipe } from '../../components/AgainSwipe';
import { DAY_HEADER_HEIGHT, DayHeader } from '../../components/DayHeader';
import { EXPENSE_ROW_HEIGHT, ExpenseRow } from '../../components/ExpenseRow';
import { PendingRow } from '../../components/PendingRow';
import { useActivityActions } from '../../hooks/useActivityActions';
import { useExpenseSearch } from '../../hooks/useExpenseSearch';
import { usePendingOccurrences } from '../../hooks/usePendingOccurrences';
import { groupByDay, type ActivityItem } from '../../utils/groupByDay';
import { styles } from './styles';

const SEARCH_DEBOUNCE_MS = 200;
/** Don't flash a spinner for loads that finish almost immediately. */
const LOADING_DELAY_MS = 300;

export function ActivityScreen() {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const entering = useEnterTransition();
  const categories = useCategories();

  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  // Opened from Insights with a category: show just those expenses (adjusted during render, not in an effect),
  // then clear the request so it applies once and the same category can be requested again later
  const { categoryId: requestedCategoryId } = useLocalSearchParams<{ categoryId?: string }>();
  const [appliedRequest, setAppliedRequest] = useState<string | undefined>(undefined);
  if (requestedCategoryId !== appliedRequest) {
    setAppliedRequest(requestedCategoryId);
    if (requestedCategoryId) {
      setCategoryId(requestedCategoryId);
      setQuery('');
    }
  }
  useEffect(() => {
    if (requestedCategoryId) router.setParams({ categoryId: undefined });
  }, [requestedCategoryId]);
  useEffect(() => {
    const timer = setTimeout(() => setText(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { result, failed, retry } = useExpenseSearch({ text, categoryId });
  const filtered = text.trim() !== '' || categoryId !== undefined;
  // Due repeating expenses show among the rows, except while searching by text; the category filter applies to them
  const pending = usePendingOccurrences();
  const visiblePending = text.trim() ? [] : pending.filter((occurrence) => !categoryId || occurrence.template.categoryId === categoryId);
  const items = result ? groupByDay(result.expenses, visiblePending) : [];

  // Fixed row heights: the list can jump anywhere in a long history without measuring
  const offsets: number[] = [];
  let offset = 0;
  for (const item of items) {
    offsets.push(offset);
    offset += item.type === 'day' ? DAY_HEADER_HEIGHT : EXPENSE_ROW_HEIGHT;
  }

  // Delete or edit from the edit screen: Undo here (still offered after a restart, within the window)
  // Also Again (saved), and Confirm / Skip of repeating expenses
  const { action: undoable, undo, error: undoError } = useUndo(['saved', 'deleted', 'edited', 'confirmed', 'skipped']);
  const undoLabel = undoable ? describeUndo(undoable.kind, undoable.expense) : '';

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const filterCategories = categories.filter((category) => category.isVisible || category.id === categoryId);

  // Only rows that just appeared animate in; rows mounted by scrolling must not
  const rowEntering: BaseAnimationBuilder = reducedMotion ? fade.entering : FadeInDown.duration(Duration.standard);
  const layout = useLayoutTransition();

  const openExpense = (expense: Expense) => router.push({ pathname: '/expense/[id]', params: { id: expense.id } });
  const occurrenceName = (occurrence: Occurrence) =>
    occurrence.template.title ?? categoryById.get(occurrence.template.categoryId)?.name ?? t('activity.row.unknownCategory');
  const actions = useActivityActions(occurrenceName);

  const renderItem = ({ item }: { item: ActivityItem }) => {
    if (item.type === 'day') return <DayHeader day={item.day} totals={item.totals} />;
    if (item.type === 'pending') {
      return (
        <Animated.View entering={fade.entering} exiting={fade.exiting}>
          <PendingRow
            occurrence={item.occurrence}
            category={categoryById.get(item.occurrence.template.categoryId)}
            onConfirm={actions.confirm}
            onSkip={actions.skip}
            onMore={actions.more}
          />
        </Animated.View>
      );
    }
    const row = (
      <AgainSwipe onAgain={() => actions.again(item.expense)}>
        <ExpenseRow
          expense={item.expense}
          category={categoryById.get(item.expense.categoryId)}
          onPress={openExpense}
          onAgain={actions.again}
        />
      </AgainSwipe>
    );
    return result?.freshIds.has(item.key) ? <Animated.View entering={rowEntering}>{row}</Animated.View> : row;
  };

  // Each state cross-fades into the next in the same space
  const { key: bodyKey, body } = ((): { key: string; body: ReactNode } => {
    if (failed) {
      return {
        key: 'error',
        body: (
          <EmptyState
            icon="error"
            title={t('activity.error.title')}
            message={t('activity.error.message')}
            action={{ label: t('activity.error.retry'), onPress: retry }}
          />
        ),
      };
    }
    if (!result) {
      return {
        key: 'loading',
        body: (
          <Animated.View entering={fade.entering.delay(LOADING_DELAY_MS)} style={styles.loading}>
            <ActivityIndicator color={colors.textSecondary} accessibilityLabel={t('activity.loading')} />
          </Animated.View>
        ),
      };
    }
    if (items.length === 0 && filtered) {
      return {
        key: 'no-matches',
        body: (
          <EmptyState
            icon="search"
            title={t('activity.noMatches.title')}
            message={t('activity.noMatches.message')}
            action={{
              label: t('activity.noMatches.clear'),
              onPress: () => {
                setQuery('');
                setCategoryId(undefined);
              },
            }}
          />
        ),
      };
    }
    if (items.length === 0) {
      return {
        key: 'empty',
        body: (
          <EmptyState
            icon="activity"
            title={t('activity.empty.title')}
            message={t('activity.empty.message')}
            action={{ label: t('activity.empty.add'), onPress: () => router.navigate('/') }}
          />
        ),
      };
    }
    return {
      key: 'list',
      body: (
        <Animated.FlatList
          data={items}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          getItemLayout={(_data, index) => ({
            length: items[index].type === 'day' ? DAY_HEADER_HEIGHT : EXPENSE_ROW_HEIGHT,
            offset: offsets[index],
            index,
          })}
          // Remaining rows slide into place when one is added or removed
          itemLayoutAnimation={layout}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={16}
          style={EdgeToEdge.scroll}
          contentContainerStyle={[styles.listContent, EdgeToEdge.content]}
        />
      ),
    };
  })();

  return (
    <Screen>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        {t('activity.title')}
      </Text>

      <View style={styles.filters}>
        <TextField
          icon="search"
          clearable
          accessibilityLabel={t('activity.search.label')}
          placeholder={t('activity.search.placeholder')}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityRole="radiogroup"
          accessibilityLabel={t('activity.filter.label')}
          style={EdgeToEdge.scroll}
          contentContainerStyle={[styles.chips, EdgeToEdge.content]}>
          <Button
            label={t('activity.filter.all')}
            variant="secondary"
            selected={categoryId === undefined}
            onPress={() => setCategoryId(undefined)}
          />
          {filterCategories.map((category) => (
            <Button
              key={category.id}
              label={category.name}
              variant="secondary"
              selected={categoryId === category.id}
              onPress={() => setCategoryId(categoryId === category.id ? undefined : category.id)}
            />
          ))}
        </ScrollView>
        {/* Several due at once (e.g. after time away): handle them together */}
        {visiblePending.length >= 2 && (
          <Animated.View {...fade} style={[styles.pendingBar, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.pendingText, { color: colors.textPrimary }]}>
              {t('activity.pending.batch', { count: visiblePending.length })}
            </Text>
            <View style={styles.pendingButtons}>
              <Button label={t('activity.pending.confirmAll')} variant="secondary" onPress={() => actions.handleAll(visiblePending, 'confirm')} />
              <Button label={t('activity.pending.skipAll')} variant="secondary" onPress={() => actions.handleAll(visiblePending, 'skip')} />
            </View>
          </Animated.View>
        )}
      </View>

      <View style={styles.body}>
        <Animated.View key={bodyKey} entering={entering} exiting={fade.exiting} style={styles.bodyLayer}>
          {body}
        </Animated.View>
      </View>

      {undoable && (
        <Animated.View
          entering={reducedMotion ? fade.entering : FadeInDown.duration(Duration.standard)}
          exiting={reducedMotion ? fade.exiting : FadeOutDown.duration(Duration.quick)}
          accessibilityLiveRegion="polite"
          style={[styles.undoBar, { backgroundColor: colors.surfaceSecondary }]}>
          {/* Keyed so the message cross-fades if the undo fails */}
          <Animated.Text
            key={undoError ?? undoLabel}
            {...fade}
            numberOfLines={2}
            style={[styles.undoText, { color: undoError ? colors.danger : colors.textPrimary }]}>
            {undoError ?? undoLabel}
          </Animated.Text>
          <Button
            label={t('activity.undo.button')}
            variant="secondary"
            onPress={undo}
            accessibilityHint={t(`activity.undo.${undoable.kind}Hint` as MessageKey)}
          />
        </Animated.View>
      )}
    </Screen>
  );
}

/** "Deleted $4.50, Coffee": one whole message per case, since word order differs between languages. */
function describeUndo(kind: UndoKind, expense: Expense) {
  const amount = formatMoney(expense.amountMinor, expense.currencyCode);
  const { title } = expense;
  return title
    ? t(`activity.undo.${kind}WithTitle` as MessageKey, { amount, title })
    : t(`activity.undo.${kind}` as MessageKey, { amount });
}
