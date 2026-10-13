import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    ...Typography.body,
    flex: 1,
    paddingVertical: Spacing.sm,
  },
  clearSlot: {
    width: MinTouchTarget,
  },
  trailingSpace: {
    width: Spacing.sm,
  },
});
