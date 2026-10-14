import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { ReducedTiming } from '@/animation/tokens';
import { fade, settleTo } from '@/animation/transitions';
import type { BudgetProgress } from '@/domain/budget/budget';
import { formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

/** "12 € left of 300 €" while the month runs, "12 € under budget" once it is over; "over" is always spelled out. */
export function budgetText({ budgetMinor, remainingMinor, over }: BudgetProgress, currencyCode: string, isCurrent: boolean) {
  const amount = formatMoney(Math.abs(remainingMinor), currencyCode);
  const budget = formatMoney(budgetMinor, currencyCode);
  if (isCurrent) return over ? t('insights.budget.overOf', { amount, budget }) : t('insights.budget.leftOf', { amount, budget });
  return over ? t('insights.budget.over', { amount }) : t('insights.budget.under', { amount });
}

type BudgetBarProps = {
  progress: BudgetProgress;
  currencyCode: string;
  isCurrent: boolean;
};

/** A thin bar of spending against a budget, with the words under it (screen readers get the words from the parent). */
export function BudgetBar({ progress, currencyCode, isCurrent }: BudgetBarProps) {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const trackWidth = useSharedValue(0);
  const fill = useSharedValue(0);
  const opacity = useSharedValue(1);
  const ratio = Math.min(1, progress.ratio);

  useEffect(() => {
    if (reducedMotion) {
      fill.set(ratio);
      opacity.set(withSequence(withTiming(0.3, { duration: 0 }), withTiming(1, ReducedTiming)));
    } else {
      fill.set(settleTo(ratio, false));
    }
  }, [ratio, reducedMotion, fill, opacity]);

  const barStyle = useAnimatedStyle(() => ({ width: trackWidth.get() * fill.get(), opacity: opacity.get() }));
  const text = budgetText(progress, currencyCode, isCurrent);

  return (
    <View style={styles.budget} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View
        style={[styles.track, { backgroundColor: colors.surfaceSecondary }]}
        onLayout={(e) => trackWidth.set(e.nativeEvent.layout.width)}>
        <Animated.View style={[styles.bar, { backgroundColor: colors.chart }, barStyle]} />
      </View>
      <Animated.Text key={text} entering={fade.entering} style={[styles.text, { color: colors.textSecondary }]}>
        {text}
      </Animated.Text>
    </View>
  );
}
