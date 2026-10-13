import { Text } from 'react-native';

import { formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';

import { styles } from './styles';

type AmountTextProps = {
  amountMinor: number;
  currencyCode: string;
};

export function AmountText({ amountMinor, currencyCode }: AmountTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[styles.amount, { color: colors.textPrimary }]}
      numberOfLines={1}
      adjustsFontSizeToFit>
      {formatMoney(amountMinor, currencyCode)}
    </Text>
  );
}
