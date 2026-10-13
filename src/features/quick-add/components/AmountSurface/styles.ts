import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  surface: {
    flex: 1,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  amount: {
    ...Typography.amount,
    // Wider than the screen on purpose: long amounts are scaled down to fit instead of being clipped
    width: 800,
    textAlign: 'center',
    padding: 0,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hintText: Typography.caption,
});
