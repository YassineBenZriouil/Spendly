import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition } from '@/animation/transitions';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import type { Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { formatMoney } from '@/domain/money/money.format';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { addLocalDays } from '@/utils/dates';
import { formatDayRange, formatMonth } from '@/utils/dateFormat';

import { CategoryBreakdown } from '../../components/CategoryBreakdown';
import { TrendChart } from '../../components/TrendChart';
import { useInsights } from '../../hooks/useInsights';
import { styles } from './styles';

/** Don't flash a spinner for loads that finish almost immediately. */
const LOADING_DELAY_MS = 300;

export function InsightsScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();
  const categories = useCategories();
  const preferences = usePreferences();
  const [kind, setKind] = useState<PeriodKind>('week');
  const [offset, setOffset] = useState(0);
  /** A currency picked here; otherwise the Settings currency. */
  const [currency, setCurrency] = useState<string | null>(null);
  const { insights, failed, retry } = useInsights(kind, offset, currency ?? preferences.currencyCode);

  const periodLabel = (() => {
    if (offset === 0) return kind === 'week' ? 'This week' : 'This month';
    if (offset === -1) return kind === 'week' ? 'Last week' : 'Last month';
    if (!insights) return '';
    const { start, end } = insights.period;
    return kind === 'week' ? formatDayRange(start, addLocalDays(end, -1)) : formatMonth(start);
  })();

  const body = (() => {
    if (failed) {
      return {
        key: 'error',
        node: (
          <EmptyState
            icon="error"
            title="Couldn't load insights"
            message="Your data is still on this device. Try again."
            action={{ label: 'Try again', onPress: retry }}
          />
        ),
      };
    }
    if (!insights) {
      return {
        key: 'loading',
        node: (
          <Animated.View entering={fade.entering.delay(LOADING_DELAY_MS)} style={styles.loading}>
            <ActivityIndicator color={colors.textSecondary} accessibilityLabel="Loading insights" />
          </Animated.View>
        ),
      };
    }
    if (!insights.hasAnyData) {
      return {
        key: 'empty',
        node: (
          <EmptyState
            icon="insights"
            title="Nothing to show yet"
            message="Weekly and monthly summaries appear once you have some expenses."
            action={{ label: 'Add an expense', onPress: () => router.navigate('/') }}
          />
        ),
      };
    }
    return { key: 'content', node: <InsightsContent insights={insights} kind={kind} offset={offset} categories={categories} /> };
  })();

  return (
    <Screen>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        Insights
      </Text>

      <View style={styles.controls}>
        <OptionGroup<PeriodKind>
          accessibilityLabel="Period"
          options={[
            { value: 'week', label: 'Week' },
            { value: 'month', label: 'Month' },
          ]}
          value={kind}
          onChange={(next) => {
            setKind(next);
            setOffset(0);
          }}
        />
        <View style={styles.periodNav}>
          <IconButton
            icon="chevronLeft"
            variant="plain"
            accessibilityLabel={`Previous ${kind}`}
            onPress={() => setOffset(offset - 1)}
          />
          <View style={styles.periodSlot} accessibilityLiveRegion="polite">
            <Animated.Text key={periodLabel} {...fade} numberOfLines={1} style={[styles.period, { color: colors.textPrimary }]}>
              {periodLabel}
            </Animated.Text>
          </View>
          <IconButton
            icon="chevronRight"
            variant="plain"
            accessibilityLabel={`Next ${kind}`}
            disabled={offset === 0}
            onPress={() => setOffset(Math.min(0, offset + 1))}
          />
        </View>
        {insights && insights.currencies.length > 1 && (
          <Animated.View {...fade}>
            <OptionGroup<string>
              accessibilityLabel="Currency"
              options={insights.currencies.map((code) => ({ value: code, label: code }))}
              value={insights.currencyCode}
              onChange={setCurrency}
            />
          </Animated.View>
        )}
      </View>

      <View style={styles.body}>
        <Animated.View key={body.key} entering={entering} exiting={fade.exiting} style={styles.bodyLayer}>
          {body.node}
        </Animated.View>
      </View>
    </Screen>
  );
}

type InsightsContentProps = {
  insights: Insights;
  kind: PeriodKind;
  offset: number;
  categories: ReturnType<typeof useCategories>;
};

function InsightsContent({ insights, kind, offset, categories }: InsightsContentProps) {
  const { colors } = useTheme();
  const { currencyCode, totalMinor, previousTotalMinor, mostFrequent } = insights;
  const total = totalMinor > 0 ? formatMoney(totalMinor, currencyCode) : 'Nothing spent';
  const mostFrequentCategory = mostFrequent && categories.find((c) => c.id === mostFrequent.categoryId);
  // Charts restart (bars grow from the baseline) when the period or currency changes
  const chartKey = `${insights.period.start.toISOString()}-${currencyCode}`;

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Total spent</Text>
        <View style={styles.totalSlot} accessible accessibilityLabel={`Total spent, ${total}`}>
          {/* Keyed so a new total cross-fades */}
          <Animated.Text
            key={total}
            {...fade}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.total, { color: colors.textPrimary }]}>
            {total}
          </Animated.Text>
        </View>
        <Comparison
          totalMinor={totalMinor}
          previousTotalMinor={previousTotalMinor}
          currencyCode={currencyCode}
          against={offset === 0 ? `the same days last ${kind}` : `the ${kind} before`}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Daily spending</Text>
        <TrendChart key={chartKey} days={insights.days} kind={kind} currencyCode={currencyCode} />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>By category</Text>
        {insights.byCategory.length > 0 ? (
          <CategoryBreakdown
            key={chartKey}
            items={insights.byCategory}
            categories={categories}
            totalMinor={totalMinor}
            currencyCode={currencyCode}
          />
        ) : (
          // In flow (the card sizes to it), so it fades in rather than cross-fading over the breakdown
          <Animated.Text entering={fade.entering} style={[styles.note, { color: colors.textSecondary }]}>
            No spending in this period.
          </Animated.Text>
        )}
      </Card>

      {mostFrequent && (
        <Animated.View {...fade}>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Most frequent</Text>
            <Text style={[styles.highlight, { color: colors.textPrimary }]}>
              {mostFrequentCategory?.name ?? 'Unknown category'} · {mostFrequent.count}{' '}
              {mostFrequent.count === 1 ? 'expense' : 'expenses'}
            </Text>
          </Card>
        </Animated.View>
      )}
    </ScrollView>
  );
}

type ComparisonProps = {
  totalMinor: number;
  previousTotalMinor: number | null;
  currencyCode: string;
  against: string;
};

/** Direction is spelled out and shown with an arrow, never by color alone. */
function Comparison({ totalMinor, previousTotalMinor, currencyCode, against }: ComparisonProps) {
  const { colors } = useTheme();
  const difference = previousTotalMinor === null ? null : totalMinor - previousTotalMinor;
  const text =
    difference === null
      ? `No data from ${against} to compare with`
      : difference === 0
        ? `Same as ${against}`
        : `${formatMoney(Math.abs(difference), currencyCode)} ${difference > 0 ? 'more' : 'less'} than ${against}`;

  return (
    <Animated.View key={text} {...fade} style={styles.comparison}>
      {difference !== null && difference !== 0 && (
        <Icon name={difference > 0 ? 'arrowUp' : 'arrowDown'} color={colors.textSecondary} size={14} />
      )}
      <Text style={[styles.note, { color: colors.textSecondary }]}>{text}</Text>
    </Animated.View>
  );
}

function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>;
}
