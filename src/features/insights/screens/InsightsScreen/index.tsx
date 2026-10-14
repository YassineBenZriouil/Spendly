import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade, useEnterTransition } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { EmptyState } from '@/components/EmptyState';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { OptionGroup } from '@/components/OptionGroup';
import { Screen } from '@/components/Screen';
import { budgetProgress, type Budget } from '@/domain/budget/budget';
import { buildHighlights, MIN_BASELINE_PERIODS, usualByCategory, type Highlight, type HighlightKind } from '@/domain/insights/highlights';
import type { Insights } from '@/domain/insights/insights.service';
import type { PeriodKind } from '@/domain/insights/period';
import { deviceLocale, formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { usePreferences } from '@/storage/preferences/preferences';
import { useTheme } from '@/theme/ThemeProvider';
import { addLocalDays } from '@/utils/dates';
import { formatDayRange, formatMonth } from '@/utils/dateFormat';
import { EdgeToEdge } from '@/theme/tokens';

import { BudgetBar, budgetText } from '../../components/BudgetBar';
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
    if (offset === 0) return kind === 'week' ? t('insights.period.thisWeek') : t('insights.period.thisMonth');
    if (offset === -1) return kind === 'week' ? t('insights.period.lastWeek') : t('insights.period.lastMonth');
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
            title={t('insights.error.title')}
            message={t('insights.error.message')}
            action={{ label: t('insights.error.retry'), onPress: retry }}
          />
        ),
      };
    }
    if (!insights) {
      return {
        key: 'loading',
        node: (
          <Animated.View entering={fade.entering.delay(LOADING_DELAY_MS)} style={styles.loading}>
            <ActivityIndicator color={colors.textSecondary} accessibilityLabel={t('insights.loading')} />
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
            title={t('insights.empty.title')}
            message={t('insights.empty.message')}
            action={{ label: t('insights.empty.action'), onPress: () => router.navigate('/') }}
          />
        ),
      };
    }
    // Budgets are monthly and in one currency: shown only for a month in that currency
    const budget = kind === 'month' && preferences.budget?.currencyCode === insights.currencyCode ? preferences.budget : null;
    return {
      key: 'content',
      node: <InsightsContent insights={insights} kind={kind} offset={offset} categories={categories} budget={budget} />,
    };
  })();

  return (
    <Screen>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
        {t('insights.title')}
      </Text>

      <View style={styles.controls}>
        <OptionGroup<PeriodKind>
          accessibilityLabel={t('insights.period.label')}
          options={[
            { value: 'week', label: t('insights.period.week') },
            { value: 'month', label: t('insights.period.month') },
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
            accessibilityLabel={t(`insights.period.previous.${kind}`)}
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
            accessibilityLabel={t(`insights.period.next.${kind}`)}
            disabled={offset === 0}
            onPress={() => setOffset(Math.min(0, offset + 1))}
          />
        </View>
        {insights && insights.currencies.length > 1 && (
          <Animated.View {...fade}>
            <OptionGroup<string>
              accessibilityLabel={t('insights.currency.label')}
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
  budget: Budget | null;
};

function InsightsContent({ insights, kind, offset, categories, budget }: InsightsContentProps) {
  const { colors } = useTheme();
  const { currencyCode, totalMinor, previousTotalMinor, incomeMinor } = insights;
  const overall = budget?.monthlyMinor ? budgetProgress(totalMinor, budget.monthlyMinor) : null;
  const spentText = totalMinor > 0 ? formatMoney(totalMinor, currencyCode) : t('insights.nothingSpent');
  const total = overall ? t('insights.total.labelWithBudget', { total: spentText, budget: budgetText(overall, currencyCode, insights.isCurrent) }) : spentText;
  const nameOf = (categoryId: string) => categories.find((c) => c.id === categoryId)?.name ?? t('insights.unknownCategory');
  const weekday = new Intl.DateTimeFormat(deviceLocale(), { weekday: 'long' });
  const highlights = buildHighlights({
    kind,
    currencyCode,
    isCurrent: insights.isCurrent,
    current: { totalMinor, byCategory: insights.byCategory },
    baseline: insights.baseline,
    days: insights.days,
    minimumMinor: insights.minimumMinor,
    categoryName: nameOf,
    dayName: (day) => weekday.format(day),
  });
  // Per-category "vs usual" only once there is enough history to know what usual is
  const usual = insights.baseline.length >= MIN_BASELINE_PERIODS ? usualByCategory(insights.baseline) : null;
  // Tap through to the expenses behind a highlight or a category
  const openCategory = (categoryId: string) => router.navigate({ pathname: '/activity', params: { categoryId } });
  // Charts restart (bars grow from the baseline) when the period or currency changes
  const chartKey = `${insights.period.start.toISOString()}-${currencyCode}`;

  return (
    <ScrollView
        showsVerticalScrollIndicator={false}
        style={EdgeToEdge.scroll}
        contentContainerStyle={[styles.content, EdgeToEdge.content]}>
      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('insights.card.highlights')}</Text>
        <View style={styles.highlights}>
          {highlights.map((highlight) => (
            // Keyed: a highlight that changes with the period fades in
            <Animated.View key={highlight.id} entering={fade.entering}>
              <HighlightRow
                highlight={highlight}
                onPress={highlight.categoryId ? () => openCategory(highlight.categoryId!) : undefined}
              />
            </Animated.View>
          ))}
        </View>
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('insights.card.total')}</Text>
        <View style={styles.totalSlot} accessible accessibilityLabel={t('insights.total.label', { total })}>
          {/* Digits roll as the total changes; switching to and from "Nothing spent" fades */}
          {totalMinor > 0 ? (
            <Animated.View key="total" entering={fade.entering}>
              <AnimatedNumber value={totalMinor} currencyCode={currencyCode} size="display" accessible={false} />
            </Animated.View>
          ) : (
            <Animated.Text key="none" entering={fade.entering} style={[styles.noTotal, { color: colors.textSecondary }]}>
              {t('insights.nothingSpent')}
            </Animated.Text>
          )}
        </View>
        <Comparison
          totalMinor={totalMinor}
          previousTotalMinor={previousTotalMinor}
          currencyCode={currencyCode}
          kind={kind}
          against={offset === 0 ? 'sameDays' : 'before'}
        />
        {overall && (
          <Animated.View entering={fade.entering}>
            <BudgetBar progress={overall} currencyCode={currencyCode} isCurrent={insights.isCurrent} />
          </Animated.View>
        )}
      </Card>

      {incomeMinor > 0 && (
        <Animated.View entering={fade.entering} exiting={fade.exiting}>
          <NetCard incomeMinor={incomeMinor} spentMinor={totalMinor} currencyCode={currencyCode} />
        </Animated.View>
      )}

      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('insights.card.daily')}</Text>
        <TrendChart
          key={chartKey}
          days={insights.days}
          kind={kind}
          currencyCode={currencyCode}
          // Today is the last tracked day of the current period (days after it have no data yet)
          todayIndex={insights.isCurrent ? insights.days.findLastIndex((day) => day.state !== 'noData') : -1}
        />
      </Card>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('insights.card.byCategory')}</Text>
        {insights.byCategory.length > 0 ? (
          <CategoryBreakdown
            key={chartKey}
            items={insights.byCategory}
            categories={categories}
            totalMinor={totalMinor}
            currencyCode={currencyCode}
            usual={usual}
            minimumMinor={insights.minimumMinor}
            onPressCategory={openCategory}
            budgets={budget?.byCategory}
            isCurrent={insights.isCurrent}
          />
        ) : (
          // In flow (the card sizes to it), so it fades in rather than cross-fading over the breakdown
          <Animated.Text entering={fade.entering} style={[styles.note, { color: colors.textSecondary }]}>
            {t('insights.noSpendingInPeriod')}
          </Animated.Text>
        )}
      </Card>

    </ScrollView>
  );
}

const HIGHLIGHT_ICONS: Record<HighlightKind, 'arrowUp' | 'arrowDown' | 'calendar' | 'insight' | 'check'> = {
  totalUp: 'arrowUp',
  categoryUp: 'arrowUp',
  totalDown: 'arrowDown',
  categoryDown: 'arrowDown',
  missing: 'insight',
  biggestDay: 'calendar',
  frequent: 'insight',
  normal: 'check',
  learning: 'insight',
};

/** One highlight sentence; the direction is in the words, the icon only repeats it. Tappable when it is about a category. */
function HighlightRow({ highlight, onPress }: { highlight: Highlight; onPress?: () => void }) {
  const { colors } = useTheme();
  const content = (
    <View style={styles.highlightRow}>
      <Icon name={HIGHLIGHT_ICONS[highlight.kind]} color={colors.textSecondary} size={16} />
      <Text style={[styles.highlightText, { color: colors.textPrimary }]}>{highlight.text}</Text>
      {onPress && <Icon name="chevronRight" color={colors.textSecondary} size={14} />}
    </View>
  );
  if (!onPress) return <View accessible>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityHint={t('insights.showExpensesHint')} onPress={onPress}>
      {content}
    </Pressable>
  );
}

type ComparisonProps = {
  totalMinor: number;
  previousTotalMinor: number | null;
  currencyCode: string;
  kind: PeriodKind;
  /** Compared with the same days of the previous period (current period) or the whole one before (past period). */
  against: 'sameDays' | 'before';
};

/** Direction is spelled out and shown with an arrow, never by color alone. */
function Comparison({ totalMinor, previousTotalMinor, currencyCode, kind, against }: ComparisonProps) {
  const { colors } = useTheme();
  const difference = previousTotalMinor === null ? null : totalMinor - previousTotalMinor;
  const text =
    difference === null
      ? t(`insights.comparison.noData.${against}.${kind}`)
      : difference === 0
        ? t(`insights.comparison.same.${against}.${kind}`)
        : t(`insights.comparison.${difference > 0 ? 'more' : 'less'}.${against}.${kind}`, {
            amount: formatMoney(Math.abs(difference), currencyCode),
          });

  return (
    <Animated.View key={text} {...fade} style={styles.comparison}>
      {difference !== null && difference !== 0 && (
        <Icon name={difference > 0 ? 'arrowUp' : 'arrowDown'} color={colors.textSecondary} size={14} />
      )}
      <Text style={[styles.note, { color: colors.textSecondary }]}>{text}</Text>
    </Animated.View>
  );
}

/** Income minus spending; whether it is ahead or behind is said in words, not by a sign or color alone. */
function NetCard({ incomeMinor, spentMinor, currencyCode }: { incomeMinor: number; spentMinor: number; currencyCode: string }) {
  const { colors } = useTheme();
  const netMinor = incomeMinor - spentMinor;
  const state = t(netMinor >= 0 ? 'insights.net.ahead' : 'insights.net.behind');
  const summary = t('insights.net.summary', {
    income: formatMoney(incomeMinor, currencyCode),
    spent: formatMoney(spentMinor, currencyCode),
  });
  return (
    <Card>
      <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>{t('insights.card.net')}</Text>
      <View
        accessible
        accessibilityLabel={t('insights.net.label', { amount: formatMoney(Math.abs(netMinor), currencyCode), state, summary })}
        style={styles.net}>
        <AnimatedNumber value={Math.abs(netMinor)} currencyCode={currencyCode} size="display" accessible={false} />
        <Animated.Text key={state} entering={fade.entering} style={[styles.netState, { color: colors.textPrimary }]}>
          {state}
        </Animated.Text>
        <Text style={[styles.note, { color: colors.textSecondary }]}>{summary}</Text>
      </View>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }]}>{children}</View>;
}
