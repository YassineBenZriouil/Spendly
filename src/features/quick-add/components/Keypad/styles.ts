import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  keypad: {
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    // Number pads keep 1 2 3 left to right in right-to-left languages too
    direction: 'ltr',
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
