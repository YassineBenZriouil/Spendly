import { StyleSheet } from 'react-native';

import { Radius, Spacing, Typography } from '@/theme/tokens';

export const styles = StyleSheet.create({
  row: {
    // Fixed height (EXPENSE_ROW_HEIGHT) so the list can skip measuring
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: Typography.label,
  subtitle: Typography.caption,
  amount: {
    ...Typography.label,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
