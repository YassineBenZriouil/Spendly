import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  keypad: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  keyCell: {
    flex: 1,
  },
  key: {
    height: MinTouchTarget,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyLabel: {
    ...Typography.title,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    flex: 1,
  },
});
