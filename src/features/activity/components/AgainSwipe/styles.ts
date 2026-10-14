import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  action: {
    marginLeft: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: MinTouchTarget * 2,
  },
  pressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  label: Typography.micro,
});
