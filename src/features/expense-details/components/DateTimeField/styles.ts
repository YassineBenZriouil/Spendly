import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    paddingLeft: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  value: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  labelLayer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  label: Typography.body,
  trailing: {
    width: MinTouchTarget,
  },
});
