import { ScrollView } from 'react-native';

import { Button } from '@/components/Button';
import { PaymentMethods } from '@/domain/expense/expense.service';
import type { PaymentMethod } from '@/domain/expense/expense.types';
import { EdgeToEdge } from '@/theme/tokens';

import { styles } from './styles';

export const PaymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  transfer: 'Transfer',
  other: 'Other',
};

type PaymentMethodPickerProps = {
  value: PaymentMethod | undefined;
  /** Tapping the selected method again clears it: the field is optional. */
  onChange: (value: PaymentMethod | undefined) => void;
};

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      accessibilityRole="radiogroup"
      accessibilityLabel="Payment method"
      style={EdgeToEdge.scroll}
      contentContainerStyle={[styles.row, EdgeToEdge.content]}>
      {PaymentMethods.map((method) => (
        <Button
          key={method}
          label={PaymentMethodLabels[method]}
          variant="secondary"
          selected={value === method}
          onPress={() => onChange(value === method ? undefined : method)}
        />
      ))}
    </ScrollView>
  );
}
