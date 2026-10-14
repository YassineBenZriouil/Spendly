import { View } from 'react-native';

import { TextField } from '@/components/TextField';
import type { ExpenseDetails } from '@/domain/expense/expense.service';
import { t } from '@/i18n';

import { DateTimeField } from '../DateTimeField';
import { PaymentMethodPicker } from '../PaymentMethodPicker';
import { styles } from './styles';

type DetailsFieldsProps = {
  details: ExpenseDetails;
  onChange: (changes: ExpenseDetails) => void;
  /** New expenses default to "now" and can go back to it; stored ones always have a date. */
  dateResettable?: boolean;
};

/** Optional context for an expense: shared by Quick Add's details panel and the edit screen. */
export function DetailsFields({ details, onChange, dateResettable = false }: DetailsFieldsProps) {
  return (
    <View style={styles.fields}>
      <TextField
        accessibilityLabel={t('expense.field.title')}
        placeholder={t('expense.field.title')}
        value={details.title ?? ''}
        onChangeText={(title) => onChange({ title })}
        maxLength={80}
        returnKeyType="done"
        autoCapitalize="sentences"
      />
      <TextField
        accessibilityLabel={t('expense.field.note')}
        placeholder={t('expense.field.note')}
        value={details.note ?? ''}
        onChangeText={(note) => onChange({ note })}
        maxLength={240}
        returnKeyType="done"
        autoCapitalize="sentences"
      />
      <DateTimeField
        value={details.occurredAt}
        onChange={(occurredAt) => onChange({ occurredAt })}
        resettable={dateResettable}
      />
      <PaymentMethodPicker value={details.paymentMethod} onChange={(paymentMethod) => onChange({ paymentMethod })} />
    </View>
  );
}
