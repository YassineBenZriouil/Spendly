import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useEnterTransition } from '@/animation/transitions';
import { AmountText } from '@/components/AmountText';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { deviceCurrency } from '@/domain/money/money.format';
import { useTheme } from '@/theme/ThemeProvider';
import { MinTouchTarget, Spacing, Typography } from '@/theme/tokens';

export default function QuickAddScreen() {
  const { colors } = useTheme();
  const entering = useEnterTransition();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>Today</Text>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={styles.iconButton}>
            <Icon name="settings" color={colors.textPrimary} />
          </Pressable>
        </Link>
      </View>

      <Animated.View entering={entering} style={styles.composer}>
        <AmountText amountMinor={0} currencyCode={deviceCurrency()} />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Quick Add arrives in Phase 1
        </Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  date: Typography.label,
  iconButton: {
    width: MinTouchTarget,
    height: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -Spacing.md,
  },
  composer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  hint: Typography.caption,
});
