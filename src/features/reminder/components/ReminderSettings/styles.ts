import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  label: Typography.body,
  value: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
});
