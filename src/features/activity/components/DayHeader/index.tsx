import { Text, View } from 'react-native';
import { LayoutAnimationConfig } from 'react-native-reanimated';

import { MoneyTotals } from '@/components/MoneyTotals';
import type { CurrencyTotal } from '@/domain/expense/expense.repository';
import { formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { formatDay } from '@/utils/dateFormat';

import { styles } from './styles';

export const DAY_HEADER_HEIGHT = 44;

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
    <View accessible accessibilityRole="header" accessibilityLabel={t('activity.dayHeader.label', { day: label, total })} style={styles.header}>
      <Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {/* Digits roll when the daily total changes; nothing fades when the header merely scrolls into view */}
      <LayoutAnimationConfig skipEntering>
        <View style={styles.totalSlot}>
          <MoneyTotals totals={totals} size="caption" color={colors.textSecondary} />
        </View>
      </LayoutAnimationConfig>
    </View>
  );
}
