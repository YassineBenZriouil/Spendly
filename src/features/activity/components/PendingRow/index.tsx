import { Pressable, Text, View } from 'react-native';

import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import type { ExpenseCategory } from '@/domain/category/category.types';
import { formatMoney } from '@/domain/money/money.format';
import type { Occurrence } from '@/domain/recurrence/recurrence.types';
import { t, type MessageKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { formatDay } from '@/utils/dateFormat';

import { styles } from './styles';

type PendingRowProps = {
  occurrence: Occurrence;
  category: ExpenseCategory | undefined;
  onConfirm: (occurrence: Occurrence) => void;
  onSkip: (occurrence: Occurrence) => void;
  /** More choices (e.g. stop repeating). */
  onMore: (occurrence: Occurrence) => void;
};

/**
 * A repeating expense that is due but not saved: dashed outline, repeat icon and "Due" wording (not color alone),
 * with Confirm and Skip on the row. Same height as an expense row, so the list keeps fixed row heights.
 */
export function PendingRow({ occurrence, category, onConfirm, onSkip, onMore }: PendingRowProps) {
  const { colors } = useTheme();
  const { template } = occurrence;
  const name = template.title ?? category?.name ?? t('activity.row.unknownCategory');
  const income = template.kind === 'income';
  const money = formatMoney(template.amountMinor, template.currencyCode);
  const amount = income ? t('activity.row.incomeAmount', { amount: money }) : money;
  const frequency = t(`expense.repeat.${occurrence.frequency}` as MessageKey);
  const due = t('activity.pending.due', { day: formatDay(new Date(occurrence.dueAt)), frequency });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('activity.pending.label', { name, amount, due })}
      accessibilityHint={t('activity.pending.hint')}
      accessibilityActions={[
        { name: 'confirm', label: t('activity.pending.confirm') },
        { name: 'skip', label: t('activity.pending.skip') },
        { name: 'stop', label: t('activity.pending.stop') },
      ]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'confirm') onConfirm(occurrence);
        else if (action === 'skip') onSkip(occurrence);
        else if (action === 'stop') onMore(occurrence);
      }}
      onPress={() => onMore(occurrence)}
      style={[styles.row, { borderColor: colors.textSecondary }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
        <Icon name="repeat" color={colors.textSecondary} size={18} />
      </View>
      <View style={styles.text}>
        <Text maxFontSizeMultiplier={FontScaleCap.control} numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
          {name}
        </Text>
        <Text maxFontSizeMultiplier={FontScaleCap.control} numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
          {due}
        </Text>
      </View>
      {income && (
        <Text maxFontSizeMultiplier={FontScaleCap.control} style={[styles.sign, { color: colors.textSecondary }]}>
          {t('activity.row.incomeSign')}
        </Text>
      )}
      <AnimatedNumber
        value={template.amountMinor}
        currencyCode={template.currencyCode}
        size="label"
        color={colors.textSecondary}
        accessible={false}
        still
      />
      {/* Screen readers use the row's actions instead */}
      <View style={styles.actions} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <IconButton icon="check" variant="plain" accessibilityLabel={t('activity.pending.confirm')} onPress={() => onConfirm(occurrence)} />
        <IconButton icon="close" variant="plain" accessibilityLabel={t('activity.pending.skip')} onPress={() => onSkip(occurrence)} />
      </View>
    </Pressable>
  );
}
