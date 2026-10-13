import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig } from 'react-native-reanimated';

import { ReducedTiming } from '@/animation/tokens';
import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import { formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';
import { formatDay } from '@/utils/dateFormat';

import { styles } from './styles';

export const DAY_HEADER_HEIGHT = 44;

const fade = {
  entering: FadeIn.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
  exiting: FadeOut.duration(ReducedTiming.duration).reduceMotion(ReducedTiming.reduceMotion),
};

type DayHeaderProps = {
  day: Date;
  totals: CurrencyTotal[];
};

export function DayHeader({ day, totals }: DayHeaderProps) {
  const { colors } = useTheme();
  const label = formatDay(day);
  // Amounts in different currencies are never added together
  const total = totals.map((t) => formatMoney(t.totalMinor, t.currencyCode)).join(' + ');

  return (
    <View accessible accessibilityRole="header" accessibilityLabel={`${label}, total ${total}`} style={styles.header}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {/* Keyed so a changed daily total cross-fades; no fade when the header merely scrolls into view */}
      <LayoutAnimationConfig skipEntering>
        <View style={styles.totalSlot}>
          <Animated.Text
            key={total}
            {...fade}
            numberOfLines={1}
            style={[styles.total, { color: colors.textSecondary }]}>
            {total}
          </Animated.Text>
        </View>
      </LayoutAnimationConfig>
    </View>
  );
}
