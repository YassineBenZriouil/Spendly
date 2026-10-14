import { Pressable, Text, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { useReducedMotion } from '@/animation/reducedMotion';
import { settleTo } from '@/animation/transitions';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { Icon } from '@/components/Icon';
import type { ExpenseCategory } from '@/domain/category/category.types';
import type { Expense } from '@/domain/expense/expense.types';
import { formatMoney } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';
import { FontScaleCap } from '@/theme/tokens';
import { formatTime } from '@/utils/dateFormat';

import { styles } from './styles';

export const EXPENSE_ROW_HEIGHT = 64;

type ExpenseRowProps = {
  expense: Expense;
  category: ExpenseCategory | undefined;
  onPress: (expense: Expense) => void;
};

export function ExpenseRow({ expense, category, onPress }: ExpenseRowProps) {
  const { colors, categoryColors } = useTheme();
  const reducedMotion = useReducedMotion();
  const pressed = useSharedValue(0);

  const categoryName = category?.name ?? 'Unknown category';
  const time = formatTime(new Date(expense.occurredAt));
  const amount = formatMoney(expense.amountMinor, expense.currencyCode);
  const tint = category ? categoryColors[category.colorToken] : colors.textSecondary;

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pressed.get(), [0, 1], [colors.background, colors.surfaceSecondary]),
    transform: [{ scale: reducedMotion ? 1 : interpolate(pressed.get(), [0, 1], [1, 0.98]) }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.title ? `${expense.title}, ` : ''}${categoryName}, ${amount}, ${time}`}
      accessibilityHint="Opens the expense to edit or delete it"
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
            {expense.title ? `${categoryName} · ${time}` : time}
          </Text>
        </View>
        <AnimatedNumber value={expense.amountMinor} currencyCode={expense.currencyCode} size="label" accessible={false} />
      </Animated.View>
    </Pressable>
  );
}
