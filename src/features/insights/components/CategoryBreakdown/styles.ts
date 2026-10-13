import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: Spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    ...Typography.label,
    flex: 1,
  },
  amount: {
    ...Typography.label,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: 8,
    // Square at the baseline (left), rounded data end
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  share: {
    ...Typography.caption,
    fontVariant: ['tabular-nums'],
    width: 40,
    textAlign: 'right',
  },
});
