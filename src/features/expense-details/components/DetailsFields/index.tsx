import { Text, View } from 'react-native';

import { OptionGroup } from '@/components/OptionGroup';
import { TextField } from '@/components/TextField';
import type { ExpenseDetails } from '@/domain/expense/expense.service';
import type { EntryKind } from '@/domain/expense/expense.types';
import type { Frequency } from '@/domain/recurrence/recurrence.types';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

import { DateTimeField } from '../DateTimeField';
import { PaymentMethodPicker } from '../PaymentMethodPicker';
import { PhotoField } from '../PhotoField';
import { styles } from './styles';

type DetailsFieldsProps = {
  details: ExpenseDetails;
  onChange: (changes: ExpenseDetails) => void;
  /** New expenses default to "now" and can go back to it; stored ones always have a date. */
  dateResettable?: boolean;
  /** Repeat choice; the picker shows only when `onRepeatChange` is given. */
  repeat?: Frequency | null;
  onRepeatChange?: (repeat: Frequency | null) => void;
  /** Expense or income; the toggle shows only when `onKindChange` is given. */
  kind?: EntryKind;
  onKindChange?: (kind: EntryKind) => void;
};

type RepeatOption = Frequency | 'none';

/** Optional context for an expense: shared by Quick Add's details panel and the edit screen. */
export function DetailsFields({
  details,
  onChange,
  dateResettable = false,
  repeat,
  onRepeatChange,
  kind = 'expense',
  onKindChange,
}: DetailsFieldsProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.fields}>
      {onKindChange && (
        <OptionGroup<EntryKind>
          accessibilityLabel={t('expense.kind.label')}
          options={[
            { value: 'expense', label: t('expense.kind.expense') },
            { value: 'income', label: t('expense.kind.income') },
          ]}
          value={kind}
          onChange={onKindChange}
        />
      )}
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
      <PhotoField photo={details.photo} onChange={(photo) => onChange({ photo })} />
      {onRepeatChange && (
        <View style={styles.repeat}>
          <OptionGroup<RepeatOption>
            accessibilityLabel={t('expense.repeat.label')}
            options={[
              { value: 'none', label: t('expense.repeat.none') },
              { value: 'daily', label: t('expense.repeat.daily') },
              { value: 'weekly', label: t('expense.repeat.weekly') },
              { value: 'monthly', label: t('expense.repeat.monthly') },
              { value: 'yearly', label: t('expense.repeat.yearly') },
            ]}
            value={repeat ?? 'none'}
            onChange={(next) => onRepeatChange(next === 'none' ? null : next)}
          />
          <Text style={[styles.repeatNote, { color: colors.textSecondary }]}>{t('expense.repeat.caption')}</Text>
        </View>
      )}
    </View>
  );
}
