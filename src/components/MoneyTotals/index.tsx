import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { fade } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import { NumberSize, type NumberSizeName } from '@/theme/tokens';

import { styles } from './styles';

type MoneyTotalsProps = {
  totals: CurrencyTotal[];
  size: NumberSizeName;
  color: string;
};

/**
 * Totals in several currencies, side by side ("12.50 € + $4.00"): amounts in different currencies are never added.
 * Decorative for screen readers: the parent element speaks the totals.
 */
export function MoneyTotals({ totals, size, color }: MoneyTotalsProps) {
  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {totals.map((total, index) => (
        <Animated.View key={total.currencyCode} {...fade} style={styles.row}>
          {index > 0 && (
            <Text allowFontScaling={false} style={[styles.plus, { color, fontSize: NumberSize[size] }]}>
              +
            </Text>
          )}
          <AnimatedNumber
            value={total.totalMinor}
            currencyCode={total.currencyCode}
            size={size}
            color={color}
            accessible={false}
          />
        </Animated.View>
      ))}
    </View>
  );
}
