import { router } from 'expo-router';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  LinearTransition,
  type BaseAnimationBuilder,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration } from '@/animation/tokens';
import { fade, useEnterTransition } from '@/animation/transitions';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { expenseRepository } from '@/domain/expense/expense.repository';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { recentlyDeleted } from '@/features/expense-details/state/recentlyDeleted';
import { useTheme } from '@/theme/ThemeProvider';
import { EdgeToEdge } from '@/theme/tokens';

import { DAY_HEADER_HEIGHT, DayHeader } from '../../components/DayHeader';
import { EXPENSE_ROW_HEIGHT, ExpenseRow } from '../../components/ExpenseRow';
import { useExpenseSearch } from '../../hooks/useExpenseSearch';
import { groupByDay, type ActivityItem } from '../../utils/groupByDay';
import { styles } from './styles';

const SEARCH_DEBOUNCE_MS = 200;
const UNDO_WINDOW_MS = 5000;
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
  useEffect(() => {
    const timer = setTimeout(() => setText(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { result, failed, retry } = useExpenseSearch({ text, categoryId });
  const filtered = text.trim() !== '' || categoryId !== undefined;
  const items = result ? groupByDay(result.expenses) : [];

  // Fixed row heights: the list can jump anywhere in a long history without measuring
  const offsets: number[] = [];
  let offset = 0;
  for (const item of items) {
    offsets.push(offset);
    offset += item.type === 'day' ? DAY_HEADER_HEIGHT : EXPENSE_ROW_HEIGHT;
  }

  const deleted = useSyncExternalStore(recentlyDeleted.subscribe, recentlyDeleted.get);
  useEffect(() => {
    if (!deleted) return;
    const timer = setTimeout(() => recentlyDeleted.set(null), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [deleted]);
  const undoDelete = async () => {
    if (!deleted) return;
    recentlyDeleted.set(null);
    try {
      // Same id and timestamps: the record comes back exactly as it was
      await expenseRepository.save(deleted);
      AccessibilityInfo.announceForAccessibility('Expense restored');
    } catch {
      recentlyDeleted.set(deleted);
    }
  };

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const filterCategories = categories.filter((category) => category.isVisible || category.id === categoryId);

  // Only rows that just appeared animate in; rows mounted by scrolling must not
  const rowEntering: BaseAnimationBuilder = reducedMotion ? fade.entering : FadeInDown.duration(Duration.standard);
  const layout = LinearTransition.duration(Duration.standard);

  const openExpense = (expense: Expense) => router.push({ pathname: '/expense/[id]', params: { id: expense.id } });

  const renderItem = ({ item }: { item: ActivityItem }) => {
    if (item.type === 'day') return <DayHeader day={item.day} totals={item.totals} />;
    const row = (
      <ExpenseRow expense={item.expense} category={categoryById.get(item.expense.categoryId)} onPress={openExpense} />
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
            title="Couldn't load expenses"
            message="Your data is still on this device. Try again."
            action={{ label: 'Try again', onPress: retry }}
          />
        ),
      };
    }
    if (!result) {
      return {
        key: 'loading',
        body: (
          <Animated.View entering={fade.entering.delay(LOADING_DELAY_MS)} style={styles.loading}>
            <ActivityIndicator color={colors.textSecondary} accessibilityLabel="Loading expenses" />
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
            title="No matches"
            message="Try a different search or category."
            action={{
              label: 'Clear filters',
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
            title="No expenses yet"
            message="Expenses you record will show up here, grouped by day."
            action={{ label: 'Add an expense', onPress: () => router.navigate('/') }}
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
        Activity
      </Text>

      <View style={styles.filters}>
        <TextField
          icon="search"
          clearable
          accessibilityLabel="Search expenses"
          placeholder="Search title, note or category"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          accessibilityRole="radiogroup"
          accessibilityLabel="Filter by category"
          style={EdgeToEdge.scroll}
          contentContainerStyle={[styles.chips, EdgeToEdge.content]}>
          <Button
            label="All"
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
      </View>

      <View style={styles.body}>
        <Animated.View key={bodyKey} entering={entering} exiting={fade.exiting} style={styles.bodyLayer}>
          {body}
        </Animated.View>
      </View>

      {deleted && (
        <Animated.View
          entering={reducedMotion ? fade.entering : FadeInDown.duration(Duration.standard)}
          exiting={reducedMotion ? fade.exiting : FadeOutDown.duration(Duration.quick)}
          accessibilityLiveRegion="polite"
          style={[styles.undoBar, { backgroundColor: colors.surfaceSecondary }]}>
          <Text numberOfLines={1} style={[styles.undoText, { color: colors.textPrimary }]}>
            Deleted {formatMoney(deleted.amountMinor, deleted.currencyCode)}
            {deleted.title ? `, ${deleted.title}` : ''}
          </Text>
          <Button label="Undo" variant="secondary" onPress={undoDelete} accessibilityHint="Restores the deleted expense" />
        </Animated.View>
      )}
    </Screen>
  );
}
