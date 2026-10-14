import { Pressable, Text, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icon';
import type { ExpenseCategory } from '@/domain/category/category.types';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { t } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { formatTime } from '@/utils/dateFormat';

import { styles } from './styles';

export const EXPENSE_ROW_HEIGHT = 64;

type ExpenseRowProps = {
  expense: Expense;
  category: ExpenseCategory | undefined;
  onPress: (expense: Expense) => void;
  /** "Again" for screen readers (the swipe's alternative). */
  onAgain?: (expense: Expense) => void;
};

export function ExpenseRow({ expense, category, onPress, onAgain }: ExpenseRowProps) {
  const { colors, categoryColors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const categoryName = category?.name ?? t('activity.row.unknownCategory');
  const time = formatTime(new Date(expense.occurredAt));
  const amount = formatMoney(expense.amountMinor, expense.currencyCode);
  const tint = category ? categoryColors[category.colorToken] : colors.textSecondary;

  const rowStyle = useAnimatedStyle(() => ({
    // No scaling: an icon inside a scaled view is shown stretched (blurry) until it is redrawn
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.background, colors.surfaceSecondary]),
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        expense.title
          ? t('activity.row.labelWithTitle', { title: expense.title, category: categoryName, amount, time })
          : t('activity.row.label', { category: categoryName, amount, time })
      }
      accessibilityHint={t('activity.row.hint')}
      accessibilityActions={onAgain ? [{ name: 'again', label: t('activity.row.again') }] : undefined}
      onAccessibilityAction={(event) => event.nativeEvent.actionName === 'again' && onAgain?.(expense)}
      onPress={() => onPress(expense)}
      onPressIn={() => pressed.set(settleTo(1, reducedMotion))}
      onPressOut={() => pressed.set(settleTo(0, reducedMotion))}>
      <Animated.View style={[styles.row, rowStyle]}>
        <View style={[styles.icon, { backgroundColor: colors.surfaceSecondary }]}>
          <Icon name={category?.icon ?? 'other'} color={tint} size={20} />
        </View>
        <View style={styles.text}>
          <Text maxFontSizeMultiplier={FontScaleCap.control} numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
            {expense.title ?? categoryName}
          </Text>
          <Text maxFontSizeMultiplier={FontScaleCap.control} numberOfLines={1} style={[styles.subtitle, { color: colors.textSecondary }]}>
            {expense.title ? t('activity.row.subtitle', { category: categoryName, time }) : time}
          </Text>
        </View>
        <AnimatedNumber value={expense.amountMinor} currencyCode={expense.currencyCode} size="label" accessible={false} />
      </Animated.View>
    </Pressable>
  );
}
