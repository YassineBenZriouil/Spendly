import { StyleSheet } from 'react-native';

import { MinTouchTarget, Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveCell: {
    flex: 1,
  },
  button: {
    height: MinTouchTarget + Spacing.sm,
    borderRadius: Radius.pill,
  },
  labelLayer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.label,
    fontWeight: '600',
  },
});
