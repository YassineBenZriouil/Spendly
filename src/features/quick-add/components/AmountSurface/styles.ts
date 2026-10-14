import { StyleSheet } from 'react-native';

import { MinTouchTarget, Spacing, Typography } from '@/theme/tokens';

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
  slot: {
    alignSelf: 'stretch',
    height: MinTouchTarget,
  },
  slotLayer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  hintText: Typography.caption,
});
