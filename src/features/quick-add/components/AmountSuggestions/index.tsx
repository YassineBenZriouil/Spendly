import { View } from 'react-native';

import { Button } from '@/components/Button';
import { formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';

import { styles } from './styles';

type AmountSuggestionsProps = {
  amounts: number[];
  currencyCode: string;
  onPick: (amountMinor: number) => void;
};

/** One-tap amounts for the selected category. */
export function AmountSuggestions({ amounts, currencyCode, onPick }: AmountSuggestionsProps) {
  return (
    <View style={styles.row} accessibilityLabel={t('quickAdd.suggestions.label')}>
      {amounts.map((amountMinor) => (
        <Button
          key={amountMinor}
          label={formatMoney(amountMinor, currencyCode)}
          variant="secondary"
          accessibilityHint={t('quickAdd.suggestions.hint')}
          onPress={() => onPick(amountMinor)}
        />
      ))}
    </View>
  );
}
