import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { Duration, ReducedTiming } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icon';
import type { ExpenseCategory } from '@/domain/category/category.types';
import type { CategorySpend } from '@/domain/insights/insights.repository';
import { formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type CategoryBreakdownProps = {
  items: CategorySpend[];
  categories: ExpenseCategory[];
  totalMinor: number;
  currencyCode: string;
};

/**
 * Spending by category as one series: bars share one ink color (identity is the labelled icon, not the bar),
 * longest = largest category. Every row is labelled, so this list doubles as the data table.
 */
export function CategoryBreakdown({ items, categories, totalMinor, currencyCode }: CategoryBreakdownProps) {
  const reducedMotion = useReducedMotion();
  const byId = new Map(categories.map((category) => [category.id, category]));
  const max = items[0]?.totalMinor ?? 0;
  const layout = reducedMotion ? undefined : LinearTransition.duration(Duration.standard);

  return (
    <View style={styles.list}>
      {items.map((item) => (
        <Animated.View
          key={item.categoryId}
          layout={layout}
          entering={fade.entering}>
          <CategoryRow
            item={item}
            category={byId.get(item.categoryId)}
            ratio={max > 0 ? item.totalMinor / max : 0}
            share={totalMinor > 0 ? Math.round((item.totalMinor / totalMinor) * 100) : 0}
            currencyCode={currencyCode}
          />
        </Animated.View>
      ))}
    </View>
  );
}

type CategoryRowProps = {
  item: CategorySpend;
  category: ExpenseCategory | undefined;
  ratio: number;
  share: number;
  currencyCode: string;
};

function CategoryRow({ item, category, ratio, share, currencyCode }: CategoryRowProps) {
  const { colors, categoryColors } = useTheme();
  const reducedMotion = useReducedMotion();
  const trackWidth = useSharedValue(0);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      progress.set(ratio);
      opacity.set(withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, ReducedTiming)));
    } else {
      progress.set(settleTo(ratio, false));
    }
  }, [ratio, reducedMotion, progress, opacity]);

  const barStyle = useAnimatedStyle(() => ({
    // At least a sliver so a tiny category still shows a mark
    width: Math.max(4, trackWidth.get() * progress.get()),
    opacity: opacity.get(),
  }));

  const name = category?.name ?? 'Unknown category';
  const amount = formatMoney(item.totalMinor, currencyCode);
  const count = `${item.count} ${item.count === 1 ? 'expense' : 'expenses'}`;

  return (
    <View accessible accessibilityLabel={`${name}, ${amount}, ${share} percent, ${count}`} style={styles.row}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon name={category?.icon ?? 'other'} color={category ? categoryColors[category.colorToken] : colors.textSecondary} size={16} />
      </View>
      <View style={styles.body}>
        <View style={styles.line}>
          <Text numberOfLines={1} style={[styles.name, { color: colors.textPrimary }]}>
            {name}
          </Text>
          <AnimatedNumber value={item.totalMinor} currencyCode={currencyCode} size="label" accessible={false} />
        </View>
        <View style={styles.line}>
          <View
            style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}
            onLayout={(e) => trackWidth.set(e.nativeEvent.layout.width)}>
            <Animated.View style={[styles.bar, { backgroundColor: colors.chart }, barStyle]} />
          </View>
          <Text style={[styles.share, { color: colors.textSecondary }]}>{share}%</Text>
        </View>
      </View>
    </View>
  );
}
