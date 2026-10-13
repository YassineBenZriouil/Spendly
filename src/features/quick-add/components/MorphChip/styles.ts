import { StyleSheet } from 'react-native';

import { Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  label: {
    ...Typography.label,
    fontWeight: '600',
  },
});
